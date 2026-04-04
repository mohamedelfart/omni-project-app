import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditTrailService } from '../audit-trail/audit-trail.service';

@Injectable()
export class IntegrationHubService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditTrailService: AuditTrailService,
  ) {}

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
  }

  async dispatchToProviderAdapter(unifiedRequestId: string) {
    const request = await this.prisma.unifiedRequest.findUniqueOrThrow({ where: { id: unifiedRequestId } });

    if (!request.vendorId) {
      return { mode: 'core-only', dispatched: false, reason: 'No vendor assigned' };
    }

    const adapter = await this.prisma.adapterConfig.findFirst({
      where: {
        providerId: request.vendorId,
        isActive: true,
        OR: [{ serviceType: request.serviceType }, { serviceType: 'all' }],
      },
      orderBy: { createdAt: 'desc' },
    });

    const routeData = {
      mode: adapter ? 'provider-adapter' : 'core-only',
      adapterId: adapter?.id,
      adapterServiceType: adapter?.serviceType,
      endpoint: adapter?.endpoint,
      dispatchedAt: new Date().toISOString(),
    };

    await this.prisma.unifiedRequest.update({
      where: { id: request.id },
      data: {
        destination: adapter ? 'external-service' : 'provider',
        routeData: this.toJson(routeData),
      },
    });

    await this.prisma.unifiedRequestTrackingEvent.create({
      data: {
        unifiedRequestId: request.id,
        actorType: 'system',
        title: adapter ? 'Integration dispatched' : 'Core dispatch queued',
        description: adapter ? `Adapter ${adapter.id} selected for ${request.serviceType}` : 'No adapter configured, staying in core provider queue.',
        status: 'ASSIGNED',
      },
    });

    await this.auditTrailService.write({
      action: 'UNIFIED_REQUEST_INTEGRATION_ROUTED',
      entity: 'UnifiedRequest',
      entityId: request.id,
      countryCode: request.country,
      metadata: routeData,
    });

    return { dispatched: true, ...routeData };
  }
}
