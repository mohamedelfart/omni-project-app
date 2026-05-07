import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommandCenterStatus, Prisma, Provider, ServiceRequestStatus, UnifiedRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { IntegrationHubService } from '../integration-hub/integration-hub.service';
import { OperatorPolicyService } from '../operator-policy/operator-policy.service';
import { toOperationalReadModelStatus } from '../unified-requests/unified-request-operational-status';
import {
  resolveUnifiedRequestExecutionSite,
  type UnifiedRequestExecutionSite,
} from '../unified-requests/execution-site.resolver';
import { resolveProviderOperationalLocation } from '../providers/provider-operational-location';
import { TicketActionsService } from '../ticket-actions/ticket-actions.service';
import type { ProviderOperationalIntentCode } from './provider-operational-intents';

@Injectable()
export class OrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationHubService: IntegrationHubService,
    private readonly auditTrailService: AuditTrailService,
    private readonly operatorPolicyService: OperatorPolicyService,
    private readonly ticketActionsService: TicketActionsService,
  ) {}

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
  }

  private toRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }

  private readonly activeLoadStatuses: UnifiedRequestStatus[] = [
    'SUBMITTED',
    'UNDER_REVIEW',
    'QUEUED',
    'ASSIGNED',
    'EN_ROUTE',
    'IN_PROGRESS',
    'AWAITING_PAYMENT',
    'ESCALATED',
  ] as const;

  private isTerminalRequestStatus(status: UnifiedRequestStatus) {
    return ['COMPLETED', 'CANCELLED', 'REJECTED', 'FAILED'].includes(status);
  }

  private assertProviderAssignmentForMutation(
    existing: { vendorId: string | null },
    expectedVendorId: string,
  ): void {
    if (existing.vendorId !== expectedVendorId) {
      throw new ForbiddenException('Request is not assigned to this provider');
    }
  }

  /**
   * Allowed provider-driven progress on assigned execution (vendor + realtime funnels).
   * Idempotent same-status updates are allowed (e.g. vendor "ACCEPTED" while already ASSIGNED).
   */
  private isAllowedProviderUnifiedStatusTransition(from: UnifiedRequestStatus, to: UnifiedRequestStatus): boolean {
    if (from === to) {
      return true;
    }
    if (this.isTerminalRequestStatus(from)) {
      return false;
    }
    if (this.isTerminalRequestStatus(to) && to !== 'COMPLETED') {
      return false;
    }
    switch (from) {
      case 'ASSIGNED':
        return ['EN_ROUTE', 'IN_PROGRESS', 'COMPLETED'].includes(to);
      case 'EN_ROUTE':
        return ['IN_PROGRESS', 'COMPLETED'].includes(to);
      case 'IN_PROGRESS':
        return to === 'COMPLETED';
      default:
        return false;
    }
  }

  private async appendProviderStatusTicketAction(params: {
    ticketId: string;
    actorUserId: string;
    fromUnified: UnifiedRequestStatus;
    toUnified: UnifiedRequestStatus;
    source: 'vendor_execution' | 'realtime';
  }): Promise<void> {
    const fromOperational = toOperationalReadModelStatus(params.fromUnified);
    const toOperational = toOperationalReadModelStatus(params.toUnified);
    await this.ticketActionsService.createAction({
      ticketId: params.ticketId,
      actionType: 'STATUS_UPDATE',
      actorType: 'provider',
      actorId: params.actorUserId,
      payload: this.toJson({
        from: fromOperational,
        to: toOperational,
        fromUnified: params.fromUnified,
        toUnified: params.toUnified,
        source: params.source,
      }),
    });
  }

  private toCommandCenterStatus(status: string): CommandCenterStatus {
    switch (status) {
      case 'MONITORING':
      case 'ACTION_REQUIRED':
      case 'RESOLVED':
        return status;
      case 'ESCALATED':
      default:
        return 'ACTION_REQUIRED';
    }
  }

  private toServiceRequestStatus(status: UnifiedRequestStatus): ServiceRequestStatus | null {
    switch (status) {
      case 'ASSIGNED':
      case 'EN_ROUTE':
      case 'IN_PROGRESS':
      case 'COMPLETED':
      case 'CANCELLED':
      case 'REJECTED':
        return status;
      default:
        return null;
    }
  }

  private resolveRequestStatusFromPayment(params: {
    currentStatus: UnifiedRequestStatus;
    vendorId?: string | null;
    paymentStatus: 'PENDING' | 'AUTHORIZED' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED' | 'WAIVED';
  }): UnifiedRequestStatus {
    const { currentStatus, vendorId, paymentStatus } = params;

    if (paymentStatus === 'PENDING' || paymentStatus === 'AUTHORIZED') {
      return this.isTerminalRequestStatus(currentStatus) ? (currentStatus as never) : 'AWAITING_PAYMENT';
    }

    if (paymentStatus === 'SUCCEEDED' || paymentStatus === 'WAIVED') {
      if (currentStatus === 'AWAITING_PAYMENT') {
        return vendorId ? 'ASSIGNED' : 'SUBMITTED';
      }
      return currentStatus as never;
    }

    if (paymentStatus === 'FAILED') {
      return this.isTerminalRequestStatus(currentStatus) ? (currentStatus as never) : 'FAILED';
    }

    if (paymentStatus === 'REFUNDED') {
      return currentStatus === 'COMPLETED' ? 'ESCALATED' : (this.isTerminalRequestStatus(currentStatus) ? (currentStatus as never) : 'ESCALATED');
    }

    return currentStatus as never;
  }

  /**
   * Sets `firstResponseAt` / `completedAt` once when entering response-satisfied or completed states.
   * Does not overwrite existing timestamps.
   */
  private buildUnifiedRequestSlaTruthFields(
    nextStatus: UnifiedRequestStatus,
    existing: { firstResponseAt: Date | null; completedAt: Date | null },
  ): Pick<Prisma.UnifiedRequestUpdateInput, 'firstResponseAt' | 'completedAt'> {
    const now = new Date();
    const patch: Pick<Prisma.UnifiedRequestUpdateInput, 'firstResponseAt' | 'completedAt'> = {};
    const responseSatisfied =
      nextStatus === UnifiedRequestStatus.IN_PROGRESS
      || nextStatus === UnifiedRequestStatus.EN_ROUTE
      || nextStatus === UnifiedRequestStatus.COMPLETED;
    if (responseSatisfied && existing.firstResponseAt == null) {
      patch.firstResponseAt = now;
    }
    if (nextStatus === UnifiedRequestStatus.COMPLETED && existing.completedAt == null) {
      patch.completedAt = now;
    }
    return patch;
  }

  private buildSmartLiteScore(params: {
    serviceTypeMatch: boolean;
    cityMatch: boolean;
    activeLoad: number;
    isFallbackEnabled: boolean;
    preferFallbackEnabledProvider: boolean;
    availabilityMatched: boolean;
  }) {
    const scoreBreakdown = {
      serviceType: params.serviceTypeMatch ? 55 : 5,
      city: params.cityMatch ? 20 : 0,
      load: params.activeLoad <= 1 ? 20 : params.activeLoad <= 3 ? 12 : params.activeLoad <= 6 ? 6 : -6,
      fallbackPolicy: params.preferFallbackEnabledProvider
        ? (params.isFallbackEnabled ? 6 : 0)
        : (params.isFallbackEnabled ? -4 : 3),
      readiness: params.availabilityMatched ? 18 : 0,
    };

    const score = Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0);

    return {
      score,
      scoreBreakdown,
    };
  }

  async selectProvider(serviceType: string, countryCode: string, city?: string) {
    const routingPolicy = this.operatorPolicyService.getRoutingPolicy(countryCode);
    const candidates = await this.prisma.provider.findMany({
      where: {
        countryCode,
        isActive: true,
        providerProfiles: {
          some: {
            availabilityStatus: { in: ['online', 'available'] },
          },
        },
      },
      include: {
        providerProfiles: {
          where: { availabilityStatus: { in: ['online', 'available'] } },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
    });

    const candidateIds = candidates.map((provider) => provider.id);
    const loadGroups = candidateIds.length
      ? await this.prisma.unifiedRequest.groupBy({
        by: ['vendorId'],
        where: {
          vendorId: { in: candidateIds },
          status: { in: this.activeLoadStatuses },
        },
        _count: { vendorId: true },
      })
      : [];

    const activeLoadByVendor = new Map<string, number>();
    for (const group of loadGroups) {
      if (!group.vendorId) continue;
      activeLoadByVendor.set(group.vendorId, group._count.vendorId);
    }

    const ranked = candidates
      .map((provider) => {
        const profile = provider.providerProfiles[0];
        const normalizedCity = city?.trim().toLowerCase();
        const providerCity = provider.city?.trim().toLowerCase();
        const cityMatch = Boolean(normalizedCity && providerCity && normalizedCity === providerCity);
        const serviceTypeMatch = provider.serviceTypes.includes(serviceType);
        const activeLoad = activeLoadByVendor.get(provider.id) ?? 0;
        const availabilityMatched = Boolean(profile && ['online', 'available'].includes(profile.availabilityStatus));
        const scored = this.buildSmartLiteScore({
          serviceTypeMatch,
          cityMatch,
          activeLoad,
          isFallbackEnabled: provider.isFallbackEnabled,
          preferFallbackEnabledProvider: routingPolicy.preferFallbackEnabledProvider,
          availabilityMatched,
        });

        return {
          provider,
          serviceTypeMatch,
          cityMatch,
          activeLoad,
          availabilityMatched,
          score: scored.score,
          scoreBreakdown: scored.scoreBreakdown,
        };
      })
      .filter((entry) => entry.serviceTypeMatch || routingPolicy.allowCountryFallbackProvider)
      .sort((a, b) => {
        if (a.score !== b.score) {
          return b.score - a.score;
        }
        return b.provider.ratingAverage - a.provider.ratingAverage;
      });

    const selected = ranked[0] ?? null;
    if (selected) {
      const fallbackUsed = !selected.serviceTypeMatch;
      return {
        provider: selected.provider,
        routingDecisionContext: {
          strategy: 'smart-lite',
          consideredVendorCount: ranked.length,
          chosenVendorId: selected.provider.id,
          chosenScore: selected.score,
          fallbackUsed,
          policyFallbackAllowed: routingPolicy.allowCountryFallbackProvider,
          influences: {
            serviceType: selected.serviceTypeMatch,
            city: selected.cityMatch,
            load: true,
            fallbackPolicy: true,
            readiness: selected.availabilityMatched,
          },
          scoreBreakdown: selected.scoreBreakdown,
          topCandidates: ranked.slice(0, 5).map((entry) => ({
            vendorId: entry.provider.id,
            score: entry.score,
            activeLoad: entry.activeLoad,
            serviceTypeMatch: entry.serviceTypeMatch,
            cityMatch: entry.cityMatch,
            fallbackEnabled: entry.provider.isFallbackEnabled,
            availabilityMatched: entry.availabilityMatched,
            scoreBreakdown: entry.scoreBreakdown,
          })),
        },
      };
    }

    return {
      provider: null,
      routingDecisionContext: {
        strategy: 'smart-lite',
        consideredVendorCount: 0,
        chosenVendorId: null,
        chosenScore: null,
        fallbackUsed: false,
        policyFallbackAllowed: routingPolicy.allowCountryFallbackProvider,
        influences: {
          serviceType: true,
          city: Boolean(city),
          load: true,
          fallbackPolicy: true,
          readiness: true,
        },
        scoreBreakdown: null,
        topCandidates: [],
      },
    };
  }

  /** Earth mean radius (km) — shadow observability only; matches Command Center haversine constant. */
  private static readonly GEO_SHADOW_EARTH_RADIUS_KM = 6371;

  /** Pure distance helper for shadow metadata only; does not affect routing. */
  private haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number | null {
    if (
      !Number.isFinite(lat1)
      || !Number.isFinite(lng1)
      || !Number.isFinite(lat2)
      || !Number.isFinite(lng2)
    ) {
      return null;
    }
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
    return OrchestratorService.GEO_SHADOW_EARTH_RADIUS_KM * c;
  }

  private extractShadowCandidateVendorIds(routingDecisionContext: Record<string, unknown>): string[] {
    const strategy = routingDecisionContext.strategy;
    if (strategy === 'pre-assigned') {
      const vid =
        typeof routingDecisionContext.chosenVendorId === 'string'
          ? routingDecisionContext.chosenVendorId.trim()
          : '';
      return vid ? [vid] : [];
    }
    const raw = routingDecisionContext.topCandidates;
    if (!Array.isArray(raw)) return [];
    const ids: string[] = [];
    for (const row of raw) {
      if (row && typeof row === 'object' && !Array.isArray(row)) {
        const id = (row as Record<string, unknown>).vendorId;
        if (typeof id === 'string' && id.trim()) ids.push(id.trim());
      }
    }
    return ids;
  }

  /**
   * Step 2C-S — observability only: distances never influence provider selection.
   */
  private async buildGeoDistanceShadow(
    executionSite: UnifiedRequestExecutionSite,
    routingDecisionContext: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const hasExecCoords =
      typeof executionSite.lat === 'number'
      && Number.isFinite(executionSite.lat)
      && typeof executionSite.lng === 'number'
      && Number.isFinite(executionSite.lng);

    const candidateVendorIds = this.extractShadowCandidateVendorIds(routingDecisionContext);

    let skippedReason: string | undefined;
    if (candidateVendorIds.length === 0) {
      skippedReason = 'No shadow candidates (empty smart-lite topCandidates or missing pre-assigned vendor id).';
    }

    const locationByVendor = new Map<string, { lat: number; lng: number }>();
    const operationalLocationSourceByVendor = new Map<string, 'dispatch-base' | 'provider-profile-fallback' | 'none'>();
    if (candidateVendorIds.length > 0) {
      const [providers, profiles] = await Promise.all([
        this.prisma.provider.findMany({
          where: { id: { in: candidateVendorIds } },
          select: { id: true, dispatchBaseLat: true, dispatchBaseLng: true },
        }),
        this.prisma.providerProfile.findMany({
          where: { providerId: { in: candidateVendorIds } },
          select: { providerId: true, currentLat: true, currentLng: true, isPrimaryContact: true },
          orderBy: [{ providerId: 'asc' }, { isPrimaryContact: 'desc' }, { id: 'asc' }],
        }),
      ]);
      const providerRowById = new Map(providers.map((p) => [p.id, p]));
      const firstProfileCoordsByVendor = new Map<string, { la: number; ln: number }>();
      for (const pf of profiles) {
        if (firstProfileCoordsByVendor.has(pf.providerId)) continue;
        const la = pf.currentLat;
        const ln = pf.currentLng;
        if (typeof la === 'number' && Number.isFinite(la) && typeof ln === 'number' && Number.isFinite(ln)) {
          firstProfileCoordsByVendor.set(pf.providerId, { la, ln });
        }
      }
      for (const providerId of candidateVendorIds) {
        if (locationByVendor.has(providerId)) continue;
        const row = providerRowById.get(providerId);
        const pf = firstProfileCoordsByVendor.get(providerId);
        const resolved = resolveProviderOperationalLocation({
          dispatchBaseLat: row?.dispatchBaseLat,
          dispatchBaseLng: row?.dispatchBaseLng,
          profileCurrentLat: pf?.la,
          profileCurrentLng: pf?.ln,
        });
        operationalLocationSourceByVendor.set(providerId, resolved.source);
        if (resolved.coords) {
          locationByVendor.set(providerId, resolved.coords);
        }
      }
    }

    const candidates = candidateVendorIds.map((providerId) => {
      const loc = locationByVendor.get(providerId);
      const hasProviderCoords = Boolean(loc);
      let distanceKm: number | null = null;
      if (hasExecCoords && loc) {
        const d = this.haversineDistanceKm(
          executionSite.lat as number,
          executionSite.lng as number,
          loc.lat,
          loc.lng,
        );
        distanceKm = d != null ? Math.round(d * 1000) / 1000 : null;
      }
      return {
        providerId,
        distanceKm,
        hasProviderCoords,
        operationalLocationSource: operationalLocationSourceByVendor.get(providerId) ?? 'none',
      };
    });

    if (!skippedReason && !hasExecCoords) {
      skippedReason = 'Execution site coordinates unavailable for shadow distance.';
    }
    if (!skippedReason && candidateVendorIds.length > 0) {
      const anyComputed = candidates.some((c) => c.distanceKm != null);
      if (!anyComputed) {
        skippedReason =
          'Provider operational coordinates missing for all shadow candidates (no valid dispatch base or profile fallback).';
      }
    }

    const base: Record<string, unknown> = {
      enabled: false,
      mode: 'shadow-only',
      appliedToSelection: false,
      executionSite: {
        source: executionSite.source,
        city: executionSite.city,
        hasCoords: hasExecCoords,
      },
      candidates,
    };
    if (skippedReason) {
      base.skippedReason = skippedReason;
    }
    return base;
  }

  async routeRequest(unifiedRequestId: string) {
    const unifiedRequest = await this.prisma.unifiedRequest.findUniqueOrThrow({ where: { id: unifiedRequestId } });
    const routingPolicy = this.operatorPolicyService.getRoutingPolicy(unifiedRequest.country);

    const propertyCityById = new Map<string, string>();
    const propertyLatLngById = new Map<string, { lat: number; lng: number }>();
    const firstPropertyId = unifiedRequest.propertyIds?.[0]?.trim();
    if (firstPropertyId) {
      const prop = await this.prisma.property.findUnique({
        where: { id: firstPropertyId },
        select: { id: true, city: true, lat: true, lng: true },
      });
      if (prop) {
        const pc = typeof prop.city === 'string' ? prop.city.trim() : '';
        if (pc) propertyCityById.set(prop.id, pc);
        if (
          typeof prop.lat === 'number'
          && Number.isFinite(prop.lat)
          && typeof prop.lng === 'number'
          && Number.isFinite(prop.lng)
        ) {
          propertyLatLngById.set(prop.id, { lat: prop.lat, lng: prop.lng });
        }
      }
    }

    const executionSite = resolveUnifiedRequestExecutionSite({
      city: unifiedRequest.city,
      propertyIds: unifiedRequest.propertyIds ?? [],
      targetLat: unifiedRequest.targetLat ?? null,
      targetLng: unifiedRequest.targetLng ?? null,
      pickupLat: unifiedRequest.pickupLat ?? null,
      pickupLng: unifiedRequest.pickupLng ?? null,
      dropoffLat: unifiedRequest.dropoffLat ?? null,
      dropoffLng: unifiedRequest.dropoffLng ?? null,
      serviceType: unifiedRequest.serviceType,
      propertyCityById,
      propertyLatLngById,
    });

    const executionSiteCityTrimmed =
      typeof executionSite.city === 'string' ? executionSite.city.trim() : '';
    const routingCityForProviderSelection =
      executionSiteCityTrimmed !== '' ? executionSiteCityTrimmed : unifiedRequest.city;

    let selected: {
      provider: Provider | null;
      routingDecisionContext: Record<string, unknown>;
    };

    if (unifiedRequest.vendorId) {
      selected = {
        provider: await this.prisma.provider.findUnique({ where: { id: unifiedRequest.vendorId } }),
        routingDecisionContext: {
          strategy: 'pre-assigned',
          consideredVendorCount: 1,
          chosenVendorId: unifiedRequest.vendorId,
          chosenScore: null,
          fallbackUsed: false,
          policyFallbackAllowed: routingPolicy.allowCountryFallbackProvider,
          influences: {
            serviceType: false,
            city: false,
            load: false,
            fallbackPolicy: false,
            readiness: false,
          },
          scoreBreakdown: null,
          topCandidates: [],
          executionSite,
        },
      };
    } else {
      // Prefer execution-site city (aligned with Command Center suitability filter) for provider.city matching;
      // falls back to raw UnifiedRequest.city when resolver yields no city string.
      const sp = await this.selectProvider(
        unifiedRequest.serviceType,
        unifiedRequest.country,
        routingCityForProviderSelection,
      );
      selected = {
        provider: sp.provider,
        routingDecisionContext: {
          ...sp.routingDecisionContext,
          executionSite,
        },
      };
    }

    const provider = selected.provider;
    const geoDistanceShadow = await this.buildGeoDistanceShadow(executionSite, selected.routingDecisionContext);
    const existingMetadata = this.toRecord(unifiedRequest.metadata);
    const serviceDispatchContext = {
      ...this.toRecord(existingMetadata.serviceDispatchContext),
      ...selected.routingDecisionContext,
      geoDistanceShadow,
    };

    if (!unifiedRequest.vendorId) {
      await this.prisma.unifiedRequest.update({
        where: { id: unifiedRequest.id },
        data: {
          vendorId: provider?.id,
          status: provider ? 'ASSIGNED' : unifiedRequest.status,
          metadata: this.toJson({
            ...existingMetadata,
            serviceDispatchContext,
          }),
        },
      });
    } else {
      await this.prisma.unifiedRequest.update({
        where: { id: unifiedRequest.id },
        data: {
          metadata: this.toJson({
            ...existingMetadata,
            serviceDispatchContext,
          }),
        },
      });
    }

    await this.prisma.unifiedRequestTrackingEvent.createMany({
      data: [
        {
          unifiedRequestId,
          actorType: 'system',
          title: 'Command center notified',
          status: 'SUBMITTED',
          description: 'Unified request mirrored to command center queue.',
        },
        {
          unifiedRequestId,
          actorType: provider ? 'system' : 'command-center',
          title: provider ? 'Provider dispatched' : 'Awaiting provider assignment',
          status: provider ? 'ASSIGNED' : 'UNDER_REVIEW',
          description: provider ? `Provider ${provider.name} selected by orchestrator.` : 'Manual assignment required.',
        },
      ],
    });

    const integration = await this.integrationHubService.dispatchToProviderAdapter(unifiedRequestId);

    await this.auditTrailService.write({
      action: 'UNIFIED_REQUEST_ROUTED',
      entity: 'UnifiedRequest',
      entityId: unifiedRequestId,
      countryCode: unifiedRequest.country,
      metadata: {
        routedToCommandCenter: true,
        routedToProvider: Boolean(provider),
        providerId: provider?.id,
        integration,
        routingPolicy,
        routingDecisionContext: serviceDispatchContext,
      },
    });

    return {
      routedToCommandCenter: true,
      routedToProvider: Boolean(provider),
      provider,
      integration,
      routingPolicy,
      routingDecisionContext: serviceDispatchContext,
    };
  }

  async dispatchInstruction(
    requestId: string,
    instructionType: string,
    payload?: Record<string, unknown>,
    actorUserId?: string,
  ) {
    const status = instructionType === 'reject' ? 'REJECTED' : instructionType === 'update-status' && payload?.status ? String(payload.status).toUpperCase() : 'UNDER_REVIEW';

    const existing = await this.prisma.unifiedRequest.findUnique({
      where: { id: requestId },
      select: { metadata: true, firstResponseAt: true, completedAt: true },
    });
    const existingMetadata = existing?.metadata && typeof existing.metadata === 'object'
      ? (existing.metadata as Record<string, unknown>)
      : {};

    const slaTruth =
      existing && (Object.values(UnifiedRequestStatus) as string[]).includes(status)
        ? this.buildUnifiedRequestSlaTruthFields(status as UnifiedRequestStatus, {
            firstResponseAt: existing.firstResponseAt,
            completedAt: existing.completedAt,
          })
        : {};

    await this.prisma.unifiedRequest.update({
      where: { id: requestId },
      data: {
        status: status as never,
        metadata: this.toJson({
          ...existingMetadata,
          commandInstruction: instructionType,
          commandInstructionPayload: payload,
        }),
        ...slaTruth,
      },
    });

    await this.prisma.unifiedRequestTrackingEvent.create({
      data: {
        unifiedRequestId: requestId,
        actorUserId,
        actorType: 'command-center',
        title: `Instruction: ${instructionType}`,
        status: status as never,
        metadata: this.toJson(payload),
      },
    });

    await this.auditTrailService.write({
      actorUserId,
      action: 'COMMAND_INSTRUCTION_DISPATCHED',
      entity: 'UnifiedRequest',
      entityId: requestId,
      metadata: {
        instructionType,
        payload,
        status,
      },
    });

    return { requestId, instructionType, dispatched: true };
  }

  /**
   * Single canonical provider assignment for unified requests (command-center + admin realtime).
   * Transactional: UnifiedRequest + viewing + maintenance projections, tracking + audit.
   * No reassignment: blocks ASSIGNED with a different vendorId; idempotent if already same vendor.
   */
  async assignProviderToUnifiedRequest(params: { requestId: string; providerId: string; actorUserId?: string }) {
    return this.mutateProviderOwnership({
      mode: 'assign',
      requestId: params.requestId,
      providerId: params.providerId,
      actorUserId: params.actorUserId,
    });
  }

  async assignProviderFromCommandCenter(requestId: string, providerId: string, actorUserId?: string) {
    const { request } = await this.assignProviderToUnifiedRequest({ requestId, providerId, actorUserId });
    return request;
  }

  async reassignProviderFromCommandCenter(params: {
    requestId: string;
    providerId: string;
    actorUserId?: string;
    reason?: string;
  }) {
    return this.mutateProviderOwnership({
      mode: 'reassign',
      requestId: params.requestId,
      providerId: params.providerId,
      actorUserId: params.actorUserId,
      reason: params.reason,
    });
  }

  private async mutateProviderOwnership(params: {
    mode: 'assign' | 'reassign';
    requestId: string;
    providerId: string;
    actorUserId?: string;
    reason?: string;
  }) {
    const { mode, requestId, providerId, actorUserId, reason } = params;
    const provider = await this.prisma.provider.findUnique({ where: { id: providerId }, select: { id: true } });
    if (!provider) {
      throw new BadRequestException({ code: 'PROVIDER_NOT_FOUND', message: `Provider ${providerId} not found` });
    }

    const { request, didMutate, previousProviderId } = await this.prisma.$transaction(async (tx) => {
      const row = await tx.unifiedRequest.findUnique({
        where: { id: requestId },
        include: {
          viewingRequest: { include: { assignment: true } },
          maintenanceRequest: { select: { id: true, providerId: true } },
        },
      });
      if (!row) {
        throw new NotFoundException({ code: 'UNIFIED_REQUEST_NOT_FOUND', message: `Unified request ${requestId} not found` });
      }
      if (this.isTerminalRequestStatus(row.status)) {
        const code = mode === 'assign' ? 'ASSIGNMENT_BLOCKED_TERMINAL' : 'REASSIGNMENT_BLOCKED_TERMINAL';
        throw new BadRequestException({
          code,
          message: `Cannot ${mode} provider in terminal request status ${row.status}`,
        });
      }

      const op = toOperationalReadModelStatus(row.status);
      if (mode === 'assign') {
        if (row.status === 'ASSIGNED' && row.vendorId === providerId) {
          return { request: row, didMutate: false, previousProviderId: row.vendorId ?? null };
        }
        if (row.status === 'ASSIGNED' && row.vendorId && row.vendorId !== providerId) {
          throw new ConflictException({
            code: 'REASSIGNMENT_NOT_ALLOWED',
            message: 'Request already assigned to a different provider; reassignment is not enabled in this phase.',
          });
        }
        if (op !== 'pending') {
          if (op === 'assigned') {
            throw new ConflictException({ code: 'REQUEST_ALREADY_ASSIGNED', message: 'Request is already assigned' });
          }
          throw new ConflictException({
            code: 'ASSIGNMENT_INVALID_STATE',
            message: `Vendor assignment is only allowed from assignable pending states (current operational: ${op})`,
          });
        }
      } else {
        if (op !== 'assigned' || row.status !== 'ASSIGNED') {
          throw new ConflictException({
            code: 'REASSIGNMENT_INVALID_STATE',
            message: `Provider reassignment requires ASSIGNED request; current operational state is ${op}.`,
          });
        }
        if (!row.vendorId) {
          throw new ConflictException({
            code: 'REASSIGNMENT_WITHOUT_CURRENT_PROVIDER',
            message: 'Cannot reassign request without an existing assigned provider.',
          });
        }
        if (row.vendorId === providerId) {
          return { request: row, didMutate: false, previousProviderId: row.vendorId ?? null };
        }
      }

      await tx.unifiedRequest.update({
        where: { id: requestId },
        data: {
          vendorId: providerId,
          status: 'ASSIGNED',
          commandCenterStatus: 'MONITORING',
        },
      });

      if (row.viewingRequest) {
        await tx.viewingRequest.update({
          where: { id: row.viewingRequest.id },
          data: { status: 'ASSIGNED' },
        });

        await tx.viewingTripAssignment.upsert({
          where: { viewingRequestId: row.viewingRequest.id },
          update: {
            providerId,
            status: 'ASSIGNED',
            etaMinutes: row.viewingRequest.assignment?.etaMinutes ?? 12,
            assignedAgentId: actorUserId,
            assignedAt: new Date(),
            startedAt: null,
            completedAt: null,
          },
          create: {
            viewingRequestId: row.viewingRequest.id,
            providerId,
            status: 'ASSIGNED',
            etaMinutes: 12,
            assignedAgentId: actorUserId,
          },
        });
      }

      if (row.maintenanceRequest) {
        await tx.maintenanceRequest.update({
          where: { id: row.maintenanceRequest.id },
          data: { providerId },
        });
      }

      const trackingTitle = mode === 'assign' ? 'Provider assigned by command center' : 'Provider reassigned by command center';
      await tx.unifiedRequestTrackingEvent.create({
        data: {
          unifiedRequestId: requestId,
          actorUserId,
          actorType: 'command-center',
          title: trackingTitle,
          status: 'ASSIGNED',
          metadata: this.toJson({
            providerId,
            previousProviderId: row.vendorId ?? null,
            reason: reason?.trim() || undefined,
          }),
        },
      });

      if (mode === 'reassign') {
        await tx.ticketAction.create({
          data: {
            ticketId: requestId,
            actionType: 'REASSIGN',
            actorType: 'command-center',
            actorId: actorUserId ?? 'system',
            payload: this.toJson({
              previousProviderId: row.vendorId,
              nextProviderId: providerId,
              reason: reason?.trim() || undefined,
            }),
          },
        });
      }

      const next = await tx.unifiedRequest.findUniqueOrThrow({
        where: { id: requestId },
        include: {
          viewingRequest: { include: { assignment: true } },
          maintenanceRequest: { select: { id: true, providerId: true } },
        },
      });
      return { request: next, didMutate: true, previousProviderId: row.vendorId ?? null };
    });

    if (didMutate) {
      await this.auditTrailService.write({
        actorUserId,
        action: mode === 'assign' ? 'COMMAND_CENTER_PROVIDER_ASSIGNED' : 'COMMAND_CENTER_PROVIDER_REASSIGNED',
        entity: 'UnifiedRequest',
        entityId: requestId,
        countryCode: request.country,
        metadata: {
          providerId,
          previousProviderId: mode === 'reassign' ? previousProviderId : undefined,
          reason: reason?.trim() || undefined,
        },
      });
    }

    return { changed: didMutate, request };
  }

  /**
   * Canonical provider-originated status mutation (vendor PATCH + realtime POST).
   * Applies ownership checks, terminal guards, transition matrix, SLA + commandCenterStatus,
   * viewing projections, tracking, audit, and STATUS_UPDATE TicketAction when status changes.
   */
  async mutateProviderRequestStatus(
    input:
      | {
          requestId: string;
          actorUserId: string;
          expectedVendorId: string;
          source: 'vendor_execution';
          vendorStatusString: string;
          note?: string;
        }
      | {
          requestId: string;
          actorUserId: string;
          expectedVendorId: string;
          source: 'realtime';
          operationalTarget: 'in_progress' | 'completed';
        },
  ) {
    const existingRequest = await this.prisma.unifiedRequest.findUnique({
      where: { id: input.requestId },
      include: { viewingRequest: { include: { assignment: true } } },
    });

    if (!existingRequest) {
      throw new BadRequestException('Request not found');
    }

    this.assertProviderAssignmentForMutation(existingRequest, input.expectedVendorId);

    if (this.isTerminalRequestStatus(existingRequest.status)) {
      throw new ConflictException({
        code: 'PROVIDER_MUTATION_BLOCKED_TERMINAL',
        message: `Provider cannot change status while request is in terminal state ${existingRequest.status}`,
      });
    }

    const mappedStatus =
      input.source === 'vendor_execution'
        ? this.integrationHubService.normalizeInboundProviderStatus(input.vendorStatusString, input.note)
        : this.integrationHubService.normalizeInboundProviderStatus(
            input.operationalTarget === 'in_progress' ? 'IN_PROGRESS' : 'COMPLETED',
          );

    if (mappedStatus.coreStatus === 'UNDER_REVIEW') {
      throw new BadRequestException('Unsupported vendor status transition');
    }

    const normalizedStatus = mappedStatus.coreStatus as UnifiedRequestStatus;

    if (!this.isAllowedProviderUnifiedStatusTransition(existingRequest.status, normalizedStatus)) {
      throw new BadRequestException(
        `Invalid provider status transition: ${existingRequest.status} -> ${normalizedStatus}`,
      );
    }

    const requestStatus = this.toServiceRequestStatus(normalizedStatus);
    const title = mappedStatus.actorEventTitle;
    const description = mappedStatus.actorEventDescription;

    const slaTruth = this.buildUnifiedRequestSlaTruthFields(normalizedStatus, {
      firstResponseAt: existingRequest.firstResponseAt,
      completedAt: existingRequest.completedAt,
    });

    const request = await this.prisma.unifiedRequest.update({
      where: { id: input.requestId },
      data: {
        status: normalizedStatus as never,
        commandCenterStatus: this.toCommandCenterStatus(mappedStatus.commandCenterStatus),
        ...slaTruth,
      },
    });

    if (existingRequest.viewingRequest && requestStatus) {
      await this.prisma.viewingRequest.update({
        where: { id: existingRequest.viewingRequest.id },
        data: {
          status: requestStatus,
        },
      });

      if (existingRequest.viewingRequest.assignment) {
        await this.prisma.viewingTripAssignment.update({
          where: { viewingRequestId: existingRequest.viewingRequest.id },
          data: {
            status: requestStatus,
            startedAt:
              requestStatus === 'IN_PROGRESS'
                ? existingRequest.viewingRequest.assignment.startedAt ?? new Date()
                : existingRequest.viewingRequest.assignment.startedAt,
            completedAt:
              requestStatus === 'COMPLETED' ? new Date() : existingRequest.viewingRequest.assignment.completedAt,
          },
        });
      }
    }

    await this.prisma.unifiedRequestTrackingEvent.create({
      data: {
        unifiedRequestId: input.requestId,
        actorUserId: input.actorUserId,
        actorType: 'provider',
        title,
        description,
        status: normalizedStatus as never,
      },
    });

    await this.auditTrailService.write({
      actorUserId: input.actorUserId,
      action: 'VENDOR_TICKET_STATUS_UPDATED',
      entity: 'UnifiedRequest',
      entityId: input.requestId,
      countryCode: request.country,
      metadata: {
        status: normalizedStatus,
        ...(input.source === 'vendor_execution' && input.note !== undefined ? { note: input.note } : {}),
        source: input.source,
      },
    });

    if (existingRequest.status !== normalizedStatus) {
      await this.appendProviderStatusTicketAction({
        ticketId: input.requestId,
        actorUserId: input.actorUserId,
        fromUnified: existingRequest.status,
        toUnified: normalizedStatus,
        source: input.source,
      });
    }

    return request;
  }

  async updateRequestStatusFromVendor(
    requestId: string,
    actorUserId: string,
    expectedVendorId: string,
    status: string,
    note?: string,
  ) {
    return this.mutateProviderRequestStatus({
      requestId,
      actorUserId,
      expectedVendorId,
      source: 'vendor_execution',
      vendorStatusString: status,
      note,
    });
  }

  /**
   * Advisory provider operational signal (no UnifiedRequest.status change, no SLA breach/escalation).
   * Appends TicketAction + audit + tracking; merges lightweight Command Center visibility under metadata.providerOperationalAttention.
   */
  async appendProviderOperationalIntent(params: {
    requestId: string;
    actorUserId: string;
    expectedVendorId: string;
    intent: ProviderOperationalIntentCode;
    note?: string;
    source: 'vendor_execution';
  }) {
    const existingRequest = await this.prisma.unifiedRequest.findUnique({
      where: { id: params.requestId },
      select: {
        id: true,
        status: true,
        vendorId: true,
        country: true,
        metadata: true,
      },
    });

    if (!existingRequest) {
      throw new BadRequestException('Request not found');
    }

    this.assertProviderAssignmentForMutation(existingRequest, params.expectedVendorId);

    if (this.isTerminalRequestStatus(existingRequest.status)) {
      throw new ConflictException({
        code: 'PROVIDER_MUTATION_BLOCKED_TERMINAL',
        message: `Provider cannot signal while request is in terminal state ${existingRequest.status}`,
      });
    }

    const recordedAt = new Date().toISOString();
    const trimmedNote = params.note?.trim();
    const attentionSlice = {
      lastIntent: params.intent,
      lastIntentAt: recordedAt,
      ...(trimmedNote ? { lastNote: trimmedNote } : {}),
    };

    const mergedMetadata = this.mergeProviderOperationalAttentionMetadata(existingRequest.metadata, attentionSlice);

    await this.prisma.unifiedRequest.update({
      where: { id: params.requestId },
      data: { metadata: mergedMetadata },
    });

    await this.ticketActionsService.createAction({
      ticketId: params.requestId,
      actionType: 'PROVIDER_OPERATIONAL_INTENT',
      actorType: 'provider',
      actorId: params.actorUserId,
      payload: this.toJson({
        intent: params.intent,
        note: trimmedNote ?? undefined,
        source: params.source,
        advisory: true,
        recordedAt,
      }),
    });

    await this.prisma.unifiedRequestTrackingEvent.create({
      data: {
        unifiedRequestId: params.requestId,
        actorUserId: params.actorUserId,
        actorType: 'provider',
        title: `Provider operational intent: ${params.intent}`,
        description: trimmedNote ?? undefined,
        status: existingRequest.status as never,
        metadata: this.toJson({
          intent: params.intent,
          source: params.source,
          advisory: true,
        }),
      },
    });

    await this.auditTrailService.write({
      actorUserId: params.actorUserId,
      action: 'PROVIDER_OPERATIONAL_INTENT_SIGNALLED',
      entity: 'UnifiedRequest',
      entityId: params.requestId,
      countryCode: existingRequest.country,
      metadata: {
        intent: params.intent,
        ...(trimmedNote ? { note: trimmedNote } : {}),
        source: params.source,
      },
    });

    return {
      ticketId: params.requestId,
      intent: params.intent,
      recordedAt,
      providerOperationalAttention: attentionSlice,
    };
  }

  private mergeProviderOperationalAttentionMetadata(
    existingMetadata: unknown,
    attentionPatch: Record<string, unknown>,
  ): Prisma.InputJsonValue {
    const base = this.toRecord(existingMetadata);
    const prev = this.toRecord(base.providerOperationalAttention);
    return this.toJson({
      ...base,
      providerOperationalAttention: {
        ...prev,
        ...attentionPatch,
      },
    });
  }

  async moveRequestToAwaitingPayment(params: {
    requestId: string;
    actorUserId: string;
    serviceType: string;
    tenantOwesMinor: number;
  }) {
    const request = await this.prisma.unifiedRequest.update({
      where: { id: params.requestId },
      data: {
        status: 'AWAITING_PAYMENT',
        paymentStatus: 'PENDING',
        commandCenterStatus: 'ACTION_REQUIRED',
      },
    });

    await this.prisma.unifiedRequestTrackingEvent.create({
      data: {
        unifiedRequestId: params.requestId,
        actorUserId: params.actorUserId,
        actorType: 'system',
        title: 'Awaiting tenant payment',
        description: `${params.serviceType} request moved to payment stage.`,
        status: 'AWAITING_PAYMENT',
        metadata: this.toJson({
          tenantOwesMinor: params.tenantOwesMinor,
          serviceType: params.serviceType,
        }),
      },
    });

    await this.auditTrailService.write({
      actorUserId: params.actorUserId,
      action: 'REQUEST_MOVED_TO_AWAITING_PAYMENT',
      entity: 'UnifiedRequest',
      entityId: params.requestId,
      countryCode: request.country,
      metadata: {
        serviceType: params.serviceType,
        tenantOwesMinor: params.tenantOwesMinor,
      },
    });

    return request;
  }

  async completeRequestFromTenant(params: {
    requestId: string;
    actorUserId: string;
    propertyIds?: string[];
    title?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }) {
    const priorTs = await this.prisma.unifiedRequest.findUniqueOrThrow({
      where: { id: params.requestId },
      select: { firstResponseAt: true, completedAt: true },
    });
    const request = await this.prisma.unifiedRequest.update({
      where: { id: params.requestId },
      data: {
        status: 'COMPLETED',
        commandCenterStatus: 'RESOLVED',
        propertyIds: params.propertyIds,
        ...this.buildUnifiedRequestSlaTruthFields(UnifiedRequestStatus.COMPLETED, priorTs),
      },
    });

    await this.prisma.unifiedRequestTrackingEvent.create({
      data: {
        unifiedRequestId: params.requestId,
        actorUserId: params.actorUserId,
        actorType: 'tenant',
        title: params.title ?? 'Tenant completed request flow',
        description: params.description,
        status: 'COMPLETED',
        metadata: this.toJson(params.metadata ?? {}),
      },
    });

    await this.auditTrailService.write({
      actorUserId: params.actorUserId,
      action: 'REQUEST_COMPLETED_BY_TENANT',
      entity: 'UnifiedRequest',
      entityId: params.requestId,
      countryCode: request.country,
      metadata: {
        propertyIds: params.propertyIds,
      },
    });

    return request;
  }

  async approvePublicServiceRequest(params: {
    requestId: string;
    actorUserId: string;
    approvalStatus: 'APPROVED';
    integrationEnabled: boolean;
    adapterKey: string;
    dispatchResult: Record<string, unknown>;
    metadataPatch: Record<string, unknown>;
  }) {
    const existing = await this.prisma.unifiedRequest.findUniqueOrThrow({
      where: { id: params.requestId },
      select: { metadata: true, country: true, firstResponseAt: true, completedAt: true },
    });

    const existingMetadata = existing.metadata && typeof existing.metadata === 'object'
      ? (existing.metadata as Record<string, unknown>)
      : {};

    const status = params.integrationEnabled ? 'IN_PROGRESS' : 'UNDER_REVIEW';

    const updated = await this.prisma.unifiedRequest.update({
      where: { id: params.requestId },
      data: {
        status: status as never,
        metadata: this.toJson({
          ...existingMetadata,
          ...params.metadataPatch,
          approvalStatus: params.approvalStatus,
          adapter: params.adapterKey,
          dispatchResult: params.dispatchResult,
        }),
        ...this.buildUnifiedRequestSlaTruthFields(status as UnifiedRequestStatus, {
          firstResponseAt: existing.firstResponseAt,
          completedAt: existing.completedAt,
        }),
      },
    });

    await this.prisma.unifiedRequestTrackingEvent.create({
      data: {
        unifiedRequestId: params.requestId,
        actorUserId: params.actorUserId,
        actorType: 'command-center',
        title: 'Public service request approved',
        description: params.integrationEnabled
          ? `Dispatched through ${params.adapterKey}.`
          : 'Approved for future dispatch. External integration currently disabled.',
        status: updated.status,
        metadata: this.toJson(params.dispatchResult),
      },
    });

    await this.auditTrailService.write({
      actorUserId: params.actorUserId,
      action: 'PUBLIC_SERVICE_REQUEST_APPROVED',
      entity: 'UnifiedRequest',
      entityId: params.requestId,
      countryCode: existing.country,
      metadata: {
        adapter: params.adapterKey,
        integrationEnabled: params.integrationEnabled,
        dispatchResult: params.dispatchResult,
      },
    });

    return updated;
  }

  async reconcileRequestPaymentOutcome(params: {
    unifiedRequestId: string;
    paymentId: string;
    paymentStatus: 'PENDING' | 'AUTHORIZED' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED' | 'WAIVED';
    actorUserId?: string;
    trigger: 'payment-created' | 'payment-status-updated';
  }) {
    const request = await this.prisma.unifiedRequest.findUniqueOrThrow({
      where: { id: params.unifiedRequestId },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        vendorId: true,
        country: true,
        serviceType: true,
        firstResponseAt: true,
        completedAt: true,
      },
    });

    const nextStatus = this.resolveRequestStatusFromPayment({
      currentStatus: request.status,
      vendorId: request.vendorId,
      paymentStatus: params.paymentStatus,
    });

    const commandCenterStatus = params.paymentStatus === 'FAILED' || params.paymentStatus === 'REFUNDED' || nextStatus === 'AWAITING_PAYMENT'
      ? 'ACTION_REQUIRED'
      : nextStatus === 'COMPLETED'
        ? 'RESOLVED'
        : 'MONITORING';

    const updated = await this.prisma.unifiedRequest.update({
      where: { id: request.id },
      data: {
        paymentStatus: params.paymentStatus,
        status: nextStatus,
        commandCenterStatus,
        ...this.buildUnifiedRequestSlaTruthFields(nextStatus, {
          firstResponseAt: request.firstResponseAt,
          completedAt: request.completedAt,
        }),
      },
    });

    const trackingTitle = params.paymentStatus === 'SUCCEEDED' || params.paymentStatus === 'WAIVED'
      ? 'Payment confirmed'
      : params.paymentStatus === 'FAILED'
        ? 'Payment failed'
        : params.paymentStatus === 'REFUNDED'
          ? 'Payment refunded'
          : 'Awaiting payment confirmation';

    await this.prisma.unifiedRequestTrackingEvent.create({
      data: {
        unifiedRequestId: request.id,
        actorUserId: params.actorUserId,
        actorType: 'system',
        title: trackingTitle,
        description: `Payment lifecycle reconciled via ${params.trigger}.`,
        status: nextStatus,
        metadata: this.toJson({
          paymentId: params.paymentId,
          paymentStatus: params.paymentStatus,
          previousRequestStatus: request.status,
          previousPaymentStatus: request.paymentStatus,
          nextRequestStatus: nextStatus,
          trigger: params.trigger,
        }),
      },
    });

    await this.auditTrailService.write({
      actorUserId: params.actorUserId,
      action: 'REQUEST_PAYMENT_RECONCILED',
      entity: 'UnifiedRequest',
      entityId: request.id,
      countryCode: request.country,
      metadata: {
        paymentId: params.paymentId,
        paymentStatus: params.paymentStatus,
        previousRequestStatus: request.status,
        nextRequestStatus: nextStatus,
        trigger: params.trigger,
      },
    });

    return updated;
  }
}