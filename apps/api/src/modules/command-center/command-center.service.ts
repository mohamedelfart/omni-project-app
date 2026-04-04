import { Injectable } from '@nestjs/common';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';

@Injectable()
export class CommandCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestratorService: OrchestratorService,
    private readonly auditTrailService: AuditTrailService,
  ) {}

  async getDashboard() {
    const [requests, providers, bookings, payments, alerts] = await Promise.all([
      this.prisma.unifiedRequest.count(),
      this.prisma.provider.count({ where: { isActive: true } }),
      this.prisma.booking.count({ where: { status: 'CONFIRMED' } }),
      this.prisma.payment.count({ where: { status: 'FAILED' } }),
      this.prisma.auditLog.count({ where: { severity: { in: ['HIGH', 'CRITICAL'] } } }),
    ]);

    return {
      metrics: {
        liveRequests: requests,
        activeProviders: providers,
        confirmedBookings: bookings,
        paymentExceptions: payments,
        escalationAlerts: alerts,
      },
    };
  }

  listRequests() {
    return this.prisma.unifiedRequest.findMany({ include: { trackingEvents: true }, orderBy: { createdAt: 'desc' } });
  }

  async assignProvider(requestId: string, providerId: string) {
    const updated = await this.prisma.unifiedRequest.update({ where: { id: requestId }, data: { vendorId: providerId, status: 'ASSIGNED' } });

    await this.auditTrailService.write({
      action: 'COMMAND_CENTER_PROVIDER_ASSIGNED',
      entity: 'UnifiedRequest',
      entityId: requestId,
      countryCode: updated.country,
      metadata: { providerId },
    });

    return updated;
  }

  async createOffer(userId: string, payload: { title: string; type: string; discountMinor?: number }) {
    const offer = await this.prisma.offer.create({
      data: {
        createdByUserId: userId,
        title: payload.title,
        type: payload.type as never,
        discountMinor: payload.discountMinor,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
    });

    await this.auditTrailService.write({
      actorUserId: userId,
      action: 'COMMAND_CENTER_OFFER_CREATED',
      entity: 'Offer',
      entityId: offer.id,
      metadata: payload as Record<string, unknown>,
    });

    return offer;
  }

  dispatchInstruction(requestId: string, instructionType: string, payload?: Record<string, unknown>) {
    return this.orchestratorService.dispatchInstruction(requestId, instructionType, payload);
  }

  listCountryConfigs() {
    return this.prisma.countryConfig.findMany({ orderBy: { code: 'asc' } });
  }

  listProviders() {
    return this.prisma.provider.findMany({ include: { adapterConfigs: true, providerProfiles: true } });
  }

  listAuditLogs(query?: { action?: string; entity?: string; countryCode?: string; severity?: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL' }) {
    return this.auditTrailService.search({
      action: query?.action,
      entity: query?.entity,
      countryCode: query?.countryCode,
      severity: query?.severity,
      take: 300,
    });
  }
}