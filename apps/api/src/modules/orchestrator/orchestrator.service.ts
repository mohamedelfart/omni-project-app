import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { IntegrationHubService } from '../integration-hub/integration-hub.service';

@Injectable()
export class OrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationHubService: IntegrationHubService,
    private readonly auditTrailService: AuditTrailService,
  ) {}

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
  }

  private toDistanceScore(fromLat?: number | null, fromLng?: number | null, toLat?: number | null, toLng?: number | null): number {
    if (
      fromLat == null ||
      fromLng == null ||
      toLat == null ||
      toLng == null
    ) {
      return Number.MAX_SAFE_INTEGER;
    }

    const dLat = fromLat - toLat;
    const dLng = fromLng - toLng;
    return Math.sqrt((dLat * dLat) + (dLng * dLng));
  }

  async selectProvider(serviceType: string, countryCode: string, city?: string, pickupLat?: number | null, pickupLng?: number | null) {
    const candidates = await this.prisma.provider.findMany({
      where: {
        countryCode,
        isActive: true,
        serviceTypes: { has: serviceType },
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

    const ranked = candidates
      .map((provider) => {
        const profile = provider.providerProfiles[0];
        return {
          provider,
          distanceScore: this.toDistanceScore(profile?.currentLat, profile?.currentLng, pickupLat, pickupLng),
          cityScore: city && provider.city && city.toLowerCase() === provider.city.toLowerCase() ? 0 : 1,
        };
      })
      .sort((a, b) => {
        if (a.cityScore !== b.cityScore) {
          return a.cityScore - b.cityScore;
        }
        if (a.distanceScore !== b.distanceScore) {
          return a.distanceScore - b.distanceScore;
        }
        if (a.provider.isFallbackEnabled !== b.provider.isFallbackEnabled) {
          return Number(a.provider.isFallbackEnabled) - Number(b.provider.isFallbackEnabled);
        }
        return b.provider.ratingAverage - a.provider.ratingAverage;
      });

    if (ranked.length > 0) {
      return ranked[0]?.provider;
    }

    return this.prisma.provider.findFirst({
      where: {
        countryCode,
        isActive: true,
        serviceTypes: { has: serviceType },
      },
      orderBy: [{ isFallbackEnabled: 'asc' }, { ratingAverage: 'desc' }],
    });
  }

  async routeRequest(unifiedRequestId: string) {
    const unifiedRequest = await this.prisma.unifiedRequest.findUniqueOrThrow({ where: { id: unifiedRequestId } });
    const provider = unifiedRequest.vendorId
      ? await this.prisma.provider.findUnique({ where: { id: unifiedRequest.vendorId } })
      : await this.selectProvider(
        unifiedRequest.serviceType,
        unifiedRequest.country,
        unifiedRequest.city,
        unifiedRequest.pickupLat,
        unifiedRequest.pickupLng,
      );

    if (provider && !unifiedRequest.vendorId) {
      await this.prisma.unifiedRequest.update({ where: { id: unifiedRequest.id }, data: { vendorId: provider.id, status: 'ASSIGNED' } });
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
      },
    });

    return {
      routedToCommandCenter: true,
      routedToProvider: Boolean(provider),
      provider,
      integration,
    };
  }

  async dispatchInstruction(requestId: string, instructionType: string, payload?: Record<string, unknown>) {
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
        actorType: 'command-center',
        title: `Instruction: ${instructionType}`,
        status: status as never,
        metadata: this.toJson(payload),
      },
    });

    await this.auditTrailService.write({
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
      },
    });

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
    const normalizedStatus = status.toUpperCase();
    const request = await this.prisma.unifiedRequest.update({
      where: { id: requestId },
      data: { status: normalizedStatus as never },
    });

    await this.prisma.unifiedRequestTrackingEvent.create({
      data: {
        unifiedRequestId: requestId,
        actorUserId,
        actorType: 'provider',
        title: 'Vendor status update',
        description: note,
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
}