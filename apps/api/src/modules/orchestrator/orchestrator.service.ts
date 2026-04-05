import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { IntegrationHubService } from '../integration-hub/integration-hub.service';
import { OperatorPolicyService } from '../operator-policy/operator-policy.service';

@Injectable()
export class OrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationHubService: IntegrationHubService,
    private readonly auditTrailService: AuditTrailService,
    private readonly operatorPolicyService: OperatorPolicyService,
  ) {}

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
  }

  private toRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }

  private readonly activeLoadStatuses = [
    'SUBMITTED',
    'UNDER_REVIEW',
    'QUEUED',
    'ASSIGNED',
    'EN_ROUTE',
    'IN_PROGRESS',
    'AWAITING_PAYMENT',
    'ESCALATED',
  ] as const;

  private isTerminalRequestStatus(status: string) {
    return ['COMPLETED', 'CANCELLED', 'REJECTED', 'FAILED'].includes(status);
  }

  private resolveRequestStatusFromPayment(params: {
    currentStatus: string;
    vendorId?: string | null;
    paymentStatus: 'PENDING' | 'AUTHORIZED' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED' | 'WAIVED';
  }): 'SUBMITTED' | 'ASSIGNED' | 'AWAITING_PAYMENT' | 'FAILED' | 'ESCALATED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED' | 'UNDER_REVIEW' | 'QUEUED' | 'EN_ROUTE' | 'IN_PROGRESS' {
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
          status: { in: [...this.activeLoadStatuses] as string[] },
        },
        _count: { _all: true },
      })
      : [];

    const activeLoadByVendor = new Map<string, number>();
    for (const group of loadGroups) {
      if (!group.vendorId) continue;
      activeLoadByVendor.set(group.vendorId, group._count._all);
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

  async routeRequest(unifiedRequestId: string) {
    const unifiedRequest = await this.prisma.unifiedRequest.findUniqueOrThrow({ where: { id: unifiedRequestId } });
    const routingPolicy = this.operatorPolicyService.getRoutingPolicy(unifiedRequest.country);
    const selected = unifiedRequest.vendorId
      ? {
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
        },
      }
      : await this.selectProvider(
        unifiedRequest.serviceType,
        unifiedRequest.country,
        unifiedRequest.city,
      );

    const provider = selected.provider;
    const existingMetadata = this.toRecord(unifiedRequest.metadata);
    const serviceDispatchContext = {
      ...this.toRecord(existingMetadata.serviceDispatchContext),
      ...selected.routingDecisionContext,
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
      select: { metadata: true },
    });
    const existingMetadata = existing?.metadata && typeof existing.metadata === 'object'
      ? (existing.metadata as Record<string, unknown>)
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

  async assignProviderFromCommandCenter(requestId: string, providerId: string, actorUserId?: string) {
    const request = await this.prisma.unifiedRequest.update({
      where: { id: requestId },
      data: {
        vendorId: providerId,
        status: 'ASSIGNED',
        commandCenterStatus: 'MONITORING',
      },
      include: { viewingRequest: { include: { assignment: true } } },
    });

    if (request.viewingRequest) {
      await this.prisma.viewingRequest.update({
        where: { id: request.viewingRequest.id },
        data: { status: 'ASSIGNED' },
      });

      await this.prisma.viewingTripAssignment.upsert({
        where: { viewingRequestId: request.viewingRequest.id },
        update: {
          providerId,
          status: 'ASSIGNED',
          etaMinutes: request.viewingRequest.assignment?.etaMinutes ?? 12,
          assignedAgentId: actorUserId,
          assignedAt: new Date(),
          startedAt: null,
          completedAt: null,
        },
        create: {
          viewingRequestId: request.viewingRequest.id,
          providerId,
          status: 'ASSIGNED',
          etaMinutes: 12,
          assignedAgentId: actorUserId,
        },
      });
    }

    await this.prisma.unifiedRequestTrackingEvent.create({
      data: {
        unifiedRequestId: requestId,
        actorUserId,
        actorType: 'command-center',
        title: 'Provider assigned by command center',
        status: 'ASSIGNED',
        metadata: this.toJson({ providerId }),
      },
    });

    await this.auditTrailService.write({
      actorUserId,
      action: 'COMMAND_CENTER_PROVIDER_ASSIGNED',
      entity: 'UnifiedRequest',
      entityId: requestId,
      countryCode: request.country,
      metadata: { providerId },
    });

    return request;
  }

  async updateRequestStatusFromVendor(requestId: string, actorUserId: string, status: string, note?: string) {
    const mappedStatus = this.integrationHubService.normalizeInboundProviderStatus(status, note);
    if (mappedStatus.coreStatus === 'UNDER_REVIEW') {
      throw new BadRequestException('Unsupported vendor status transition');
    }

    const normalizedStatus = mappedStatus.coreStatus;
    const title = mappedStatus.actorEventTitle;
    const description = mappedStatus.actorEventDescription;
    const existingRequest = await this.prisma.unifiedRequest.findUnique({
      where: { id: requestId },
      include: { viewingRequest: { include: { assignment: true } } },
    });

    if (!existingRequest) {
      throw new BadRequestException('Request not found');
    }

    const request = await this.prisma.unifiedRequest.update({
      where: { id: requestId },
      data: {
        status: normalizedStatus as never,
        commandCenterStatus: mappedStatus.commandCenterStatus,
      },
    });

    if (existingRequest.viewingRequest) {
      await this.prisma.viewingRequest.update({
        where: { id: existingRequest.viewingRequest.id },
        data: {
          status: normalizedStatus,
        },
      });

      if (existingRequest.viewingRequest.assignment) {
        await this.prisma.viewingTripAssignment.update({
          where: { viewingRequestId: existingRequest.viewingRequest.id },
          data: {
            status: normalizedStatus,
            startedAt: normalizedStatus === 'IN_PROGRESS'
              ? existingRequest.viewingRequest.assignment.startedAt ?? new Date()
              : existingRequest.viewingRequest.assignment.startedAt,
            completedAt: normalizedStatus === 'COMPLETED' ? new Date() : existingRequest.viewingRequest.assignment.completedAt,
          },
        });
      }
    }

    await this.prisma.unifiedRequestTrackingEvent.create({
      data: {
        unifiedRequestId: requestId,
        actorUserId,
        actorType: 'provider',
        title,
        description,
        status: normalizedStatus as never,
      },
    });

    await this.auditTrailService.write({
      actorUserId,
      action: 'VENDOR_TICKET_STATUS_UPDATED',
      entity: 'UnifiedRequest',
      entityId: requestId,
      countryCode: request.country,
      metadata: { status: normalizedStatus, note },
    });

    return request;
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
    const request = await this.prisma.unifiedRequest.update({
      where: { id: params.requestId },
      data: {
        status: 'COMPLETED',
        commandCenterStatus: 'RESOLVED',
        propertyIds: params.propertyIds,
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
      select: { metadata: true, country: true },
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