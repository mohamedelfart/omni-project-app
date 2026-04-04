import { Injectable } from '@nestjs/common';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';

type DashboardFilters = {
  countryCode?: string;
  startDate?: string;
  endDate?: string;
  assetId?: string;
  serviceType?: string;
  status?: string;
};

@Injectable()
export class CommandCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestratorService: OrchestratorService,
    private readonly auditTrailService: AuditTrailService,
  ) {}

  private buildDateRange(filters?: DashboardFilters) {
    if (!filters?.startDate && !filters?.endDate) {
      return undefined;
    }

    return {
      gte: filters.startDate ? new Date(filters.startDate) : undefined,
      lte: filters.endDate ? new Date(filters.endDate) : undefined,
    };
  }

  private extractFinancials(metadata: unknown) {
    if (!metadata || typeof metadata !== 'object') {
      return { coveredAmountMinor: 0, tenantOwesMinor: 0 };
    }

    const freeServiceEvaluation = (metadata as Record<string, unknown>).freeServiceEvaluation;
    if (!freeServiceEvaluation || typeof freeServiceEvaluation !== 'object') {
      return { coveredAmountMinor: 0, tenantOwesMinor: 0 };
    }

    const raw = freeServiceEvaluation as Record<string, unknown>;
    return {
      coveredAmountMinor: Number(raw.coveredAmountMinor ?? 0),
      tenantOwesMinor: Number(raw.tenantOwesMinor ?? 0),
    };
  }

  private average(values: number[]) {
    if (!values.length) {
      return 0;
    }

    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }

  private buildRequestWhere(filters?: DashboardFilters) {
    return {
      country: filters?.countryCode,
      serviceType: filters?.serviceType,
      status: filters?.status as never,
      propertyIds: filters?.assetId ? { has: filters.assetId } : undefined,
      createdAt: this.buildDateRange(filters),
    };
  }

  async getDashboard(filters?: DashboardFilters) {
    const requestWhere = this.buildRequestWhere(filters);
    const bookingWhere = {
      createdAt: this.buildDateRange(filters),
      propertyId: filters?.assetId,
      property: filters?.countryCode ? { countryCode: filters.countryCode } : undefined,
    };
    const propertyWhere = {
      countryCode: filters?.countryCode,
      id: filters?.assetId,
    };

    const [requests, providers, bookings, properties, users, alerts] = await Promise.all([
      this.prisma.unifiedRequest.findMany({ where: requestWhere, include: { trackingEvents: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.provider.findMany({ where: { countryCode: filters?.countryCode, isActive: true } }),
      this.prisma.booking.findMany({ where: bookingWhere, include: { property: true } }),
      this.prisma.property.findMany({ where: propertyWhere }),
      this.prisma.user.findMany({ where: { countryCode: filters?.countryCode } }),
      this.prisma.auditLog.count({ where: { severity: { in: ['HIGH', 'CRITICAL'] }, countryCode: filters?.countryCode } }),
    ]);

    const activeStatuses = new Set(['SUBMITTED', 'UNDER_REVIEW', 'QUEUED', 'ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS', 'AWAITING_PAYMENT', 'ESCALATED']);
    const activeTickets = requests.filter((request) => activeStatuses.has(request.status)).length;
    const completedRequests = requests.filter((request) => request.status === 'COMPLETED');
    const assignedEventsMinutes = requests
      .map((request) => {
        const assignedEvent = request.trackingEvents.find((event) => event.status === 'ASSIGNED');
        return assignedEvent ? (assignedEvent.createdAt.getTime() - request.createdAt.getTime()) / 60000 : null;
      })
      .filter((value): value is number => value != null && value >= 0);
    const resolutionMinutes = completedRequests.map((request) => (request.updatedAt.getTime() - request.createdAt.getTime()) / 60000);

    const totalRevenueMinor = bookings.reduce((sum, booking) => sum + booking.totalAmountMinor, 0);
    const platformMarginMinor = bookings.reduce((sum, booking) => sum + (booking.property.serviceFeeMinor * booking.termMonths), 0);
    const serviceCostMinor = requests.reduce((sum, request) => sum + this.extractFinancials(request.metadata).coveredAmountMinor, 0);
    const recoveredServiceRevenueMinor = requests.reduce((sum, request) => sum + this.extractFinancials(request.metadata).tenantOwesMinor, 0);

    const assetMetrics = properties.map((property) => {
      const propertyBookings = bookings.filter((booking) => booking.propertyId === property.id);
      const assetRevenueMinor = propertyBookings.reduce((sum, booking) => sum + booking.totalAmountMinor, 0);
      const assetMarginMinor = propertyBookings.reduce((sum, booking) => sum + (property.serviceFeeMinor * booking.termMonths), 0);
      const assetServiceCostMinor = requests
        .filter((request) => request.propertyIds.includes(property.id))
        .reduce((sum, request) => sum + this.extractFinancials(request.metadata).coveredAmountMinor, 0);
      const profitabilityScore = assetRevenueMinor === 0
        ? 0
        : Math.round(((assetMarginMinor - assetServiceCostMinor) / assetRevenueMinor) * 100);

      return {
        assetId: property.id,
        title: property.title,
        revenueMinor: assetRevenueMinor,
        netProfitMinor: assetMarginMinor - assetServiceCostMinor,
        profitabilityScore,
      };
    });

    const vendorPerformance = providers.map((provider) => {
      const vendorRequests = requests.filter((request) => request.vendorId === provider.id);
      const completed = vendorRequests.filter((request) => request.status === 'COMPLETED').length;
      return {
        providerId: provider.id,
        providerName: provider.name,
        activeTickets: vendorRequests.filter((request) => activeStatuses.has(request.status)).length,
        completedTickets: completed,
        completionRate: vendorRequests.length ? Math.round((completed / vendorRequests.length) * 100) : 0,
        ratingAverage: provider.ratingAverage,
      };
    }).sort((a, b) => b.completionRate - a.completionRate || b.ratingAverage - a.ratingAverage);

    const tenantBookingsMap = new Map<string, number>();
    for (const booking of bookings) {
      tenantBookingsMap.set(booking.tenantId, (tenantBookingsMap.get(booking.tenantId) ?? 0) + 1);
    }

    const requestUsageMap = requests.reduce<Record<string, { count: number; costMinor: number }>>((acc, request) => {
      const current = acc[request.serviceType] ?? { count: 0, costMinor: 0 };
      const financials = this.extractFinancials(request.metadata);
      acc[request.serviceType] = {
        count: current.count + 1,
        costMinor: current.costMinor + financials.coveredAmountMinor,
      };
      return acc;
    }, {});

    const serviceBreakdown = Object.entries(requestUsageMap)
      .map(([serviceType, values]) => ({
        serviceType,
        requestVolume: values.count,
        totalCostMinor: values.costMinor,
        costPerServiceMinor: values.count ? Math.round(values.costMinor / values.count) : 0,
      }))
      .sort((a, b) => b.requestVolume - a.requestVolume);

    return {
      filters: filters ?? {},
      metrics: {
        liveRequests: requests.length,
        activeProviders: providers.length,
        confirmedBookings: bookings.filter((booking) => ['CONFIRMED', 'ACTIVE'].includes(booking.status)).length,
        paymentExceptions: requests.filter((request) => request.paymentStatus === 'FAILED').length,
        escalationAlerts: alerts,
      },
      operations: {
        activeTickets,
        avgResponseTimeMinutes: this.average(assignedEventsMinutes),
        avgResolutionTimeMinutes: this.average(resolutionMinutes),
        vendorPerformance: vendorPerformance.slice(0, 8),
      },
      financial: {
        totalRevenueMinor,
        platformMarginMinor,
        serviceCostMinor,
        recoveredServiceRevenueMinor,
        costVsRevenueRatio: totalRevenueMinor ? Number((serviceCostMinor / totalRevenueMinor).toFixed(4)) : 0,
        costVsMarginRatio: platformMarginMinor ? Number((serviceCostMinor / platformMarginMinor).toFixed(4)) : 0,
      },
      assetPerformance: {
        occupancyRate: properties.length ? Number((bookings.length / properties.length).toFixed(2)) : 0,
        revenuePerAssetMinor: properties.length ? Math.round(totalRevenueMinor / properties.length) : 0,
        topAssets: assetMetrics.sort((a, b) => b.netProfitMinor - a.netProfitMinor).slice(0, 10),
      },
      tenant: {
        activeTenants: new Set(bookings.map((booking) => booking.tenantId)).size,
        retentionRate: tenantBookingsMap.size
          ? Math.round((Array.from(tenantBookingsMap.values()).filter((count) => count > 1).length / tenantBookingsMap.size) * 100)
          : 0,
        avgServiceUsage: users.length ? Number((requests.length / users.length).toFixed(2)) : 0,
      },
      service: {
        requestVolume: requests.length,
        mostUsedServices: serviceBreakdown.slice(0, 5),
        serviceBreakdown,
      },
    };
  }

  listRequests(filters?: DashboardFilters) {
    return this.prisma.unifiedRequest.findMany({
      where: this.buildRequestWhere(filters),
      include: { trackingEvents: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async assignProvider(requestId: string, providerId: string) {
    return this.orchestratorService.assignProviderFromCommandCenter(requestId, providerId);
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