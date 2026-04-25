import { Injectable } from '@nestjs/common';
import { BookingStatus, PaymentStatus, PropertyStatus } from '@prisma/client';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { LocationService } from '../location/location.service';
import { OperatorPolicyService } from '../operator-policy/operator-policy.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { UnifiedRequestsService } from '../unified-requests/unified-requests.service';
import { DecisionSupportService } from './decision-support.service';

type DashboardFilters = {
  countryCode?: string;
  startDate?: string;
  endDate?: string;
  assetId?: string;
  serviceType?: string;
  status?: string;
  vendorId?: string;
};

function toDbUnifiedRequestStatus(status?: string): string | undefined {
  if (!status) {
    return undefined;
  }
  const normalized = status.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized === 'pending') {
    return 'SUBMITTED';
  }
  if (normalized === 'assigned') {
    return 'ASSIGNED';
  }
  if (normalized === 'in_progress') {
    return 'IN_PROGRESS';
  }
  if (normalized === 'completed') {
    return 'COMPLETED';
  }
  return status;
}

function normalizeCountryCandidates(countryCode?: string): string[] | undefined {
  if (!countryCode) {
    return undefined;
  }
  const raw = countryCode.trim();
  if (!raw) {
    return undefined;
  }
  const upper = raw.toUpperCase();
  const candidates = new Set<string>([raw, upper]);
  if (upper === 'QA') {
    candidates.add('Qatar');
  }
  return Array.from(candidates);
}

@Injectable()
export class CommandCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestratorService: OrchestratorService,
    private readonly unifiedRequestsService: UnifiedRequestsService,
    private readonly auditTrailService: AuditTrailService,
    private readonly operatorPolicyService: OperatorPolicyService,
    private readonly decisionSupportService: DecisionSupportService,
    private readonly locationService: LocationService,
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
    const countryCandidates = normalizeCountryCandidates(filters?.countryCode);
    const status = toDbUnifiedRequestStatus(filters?.status);
    return {
      country: countryCandidates ? { in: countryCandidates } : undefined,
      serviceType: filters?.serviceType,
      status: status as never,
      vendorId: filters?.vendorId,
      propertyIds: filters?.assetId ? { has: filters.assetId } : undefined,
      createdAt: this.buildDateRange(filters),
    };
  }

  private isActiveStatus(status: string) {
    return ['SUBMITTED', 'UNDER_REVIEW', 'QUEUED', 'ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS', 'AWAITING_PAYMENT', 'ESCALATED'].includes(status);
  }

  private requestLifecycleDurations(request: {
    createdAt: Date;
    updatedAt: Date;
    status: string;
    trackingEvents: Array<{ actorType: string; createdAt: Date }>;
  }) {
    const firstVendorAction = request.trackingEvents
      .filter((event) => event.actorType === 'provider')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

    const responseMinutes = firstVendorAction
      ? Math.max(0, Math.round((firstVendorAction.createdAt.getTime() - request.createdAt.getTime()) / 60000))
      : null;

    const completionMinutes = request.status === 'COMPLETED'
      ? Math.max(0, Math.round((request.updatedAt.getTime() - request.createdAt.getTime()) / 60000))
      : null;

    return { responseMinutes, completionMinutes };
  }

  private dayKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private toRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }

  private extractIntegrationVisibility(routeData: unknown) {
    const raw = this.toRecord(routeData);
    return {
      adapterKey: typeof raw.adapterKey === 'string' ? raw.adapterKey : null,
      adapterContractType: typeof raw.adapterContractType === 'string' ? raw.adapterContractType : null,
      simulationMode: Boolean(raw.simulationMode),
      simulatedProviderResponse: this.toRecord(raw.simulatedDispatch),
      routingDecisionContext: this.toRecord(raw.routingDecisionContext),
    };
  }

  private extractTicketLocationContext(request: {
    pickupLat?: number | null;
    pickupLng?: number | null;
    currentLat?: number | null;
    currentLng?: number | null;
    targetLat?: number | null;
    targetLng?: number | null;
    dropoffLat?: number | null;
    dropoffLng?: number | null;
    locationLabel?: string | null;
    city: string;
    country: string;
  }) {
    // Primary: pickup → current → target
    const primaryLat = request.pickupLat ?? request.currentLat ?? request.targetLat;
    const primaryLng = request.pickupLng ?? request.currentLng ?? request.targetLng;
    const sourceType = request.pickupLat != null ? 'pickup'
      : request.currentLat != null ? 'tenant-current'
      : 'service-site';

    return this.locationService.buildLocationDisplay({
      sourceType: sourceType as 'pickup' | 'tenant-current' | 'service-site',
      lat: primaryLat,
      lng: primaryLng,
      placeLabel: request.locationLabel ?? null,
      city: request.city,
      countryCode: request.country,
    });
  }

  private includeForOperations() {
    return {
      trackingEvents: { orderBy: { createdAt: 'asc' as const } },
      payment: {
        select: {
          id: true,
          amountMinor: true,
          currency: true,
          status: true,
          createdAt: true,
        },
      },
      viewingRequest: {
        select: {
          id: true,
        },
      },
      movingRequest: {
        select: {
          id: true,
        },
      },
      maintenanceRequest: {
        select: {
          id: true,
        },
      },
      cleaningRequest: {
        select: {
          id: true,
        },
      },
      airportTransfer: {
        select: {
          id: true,
        },
      },
    };
  }

  async getOperationsLayer(filters?: DashboardFilters) {
    const policyContext = await this.operatorPolicyService.getRuntimePolicyContext(filters?.countryCode);
    const requests = await this.prisma.unifiedRequest.findMany({
      where: this.buildRequestWhere(filters),
      include: this.includeForOperations(),
      orderBy: { createdAt: 'desc' },
    });

    return {
      filters: filters ?? {},
      policyContext,
      total: requests.length,
      tickets: requests.map((request) => {
        const financials = this.extractFinancials(request.metadata);
        const lifecycle = this.requestLifecycleDurations(request);
        const policyMetadata = request.metadata && typeof request.metadata === 'object'
          ? ((request.metadata as Record<string, unknown>).policyContext as Record<string, unknown> | undefined)
          : undefined;
        const hasServiceEntity = Boolean(
          request.viewingRequest ||
          request.movingRequest ||
          request.maintenanceRequest ||
          request.cleaningRequest ||
          request.airportTransfer,
        );

        return {
          ticketId: request.id,
          serviceType: request.serviceType,
          tenantId: request.tenantId,
          status: request.status,
          assignedVendor: request.vendorId,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt,
          country: request.country,
          city: request.city,
          cost: {
            coveredAmountMinor: financials.coveredAmountMinor,
            excessAmountMinor: financials.tenantOwesMinor,
            paymentStatus: request.paymentStatus,
            paymentAmountMinor: request.payment?.amountMinor ?? 0,
            paymentCurrency: request.payment?.currency ?? null,
          },
          auditVisibility: {
            trackingEventCount: request.trackingEvents.length,
            firstVendorActionAt: request.trackingEvents.find((event) => event.actorType === 'provider')?.createdAt ?? null,
            lastEventAt: request.trackingEvents[request.trackingEvents.length - 1]?.createdAt ?? null,
            responseMinutes: lifecycle.responseMinutes,
            completionMinutes: lifecycle.completionMinutes,
          },
          lifecycle: {
            requestEntityPresent: hasServiceEntity,
            indexedBy: {
              serviceType: request.serviceType,
              vendorId: request.vendorId,
              country: request.country,
              city: request.city,
            },
          },
          policyDrivenBy: {
            countryPack: request.country,
            serviceRule: policyMetadata?.serviceRule ?? null,
            routingPolicy: policyMetadata?.routingPolicy ?? policyContext.routingPolicy,
            perkPolicy: policyMetadata?.perkPolicy ?? policyContext.perkPolicy,
            financialPolicy: policyMetadata?.financialPolicy ?? policyContext.financialPolicy,
          },
          locationContext: this.extractTicketLocationContext(request),
          geoContext: {
            city: request.city,
            countryCode: request.country,
            hasLocation: request.pickupLat != null || request.currentLat != null || request.targetLat != null,
          },
          integrationVisibility: this.extractIntegrationVisibility(request.routeData),
        };
      }),
    };
  }

  async getAnalysisLayer(filters?: DashboardFilters) {
    const policyContext = await this.operatorPolicyService.getRuntimePolicyContext(filters?.countryCode);
    const requests = await this.prisma.unifiedRequest.findMany({
      where: this.buildRequestWhere(filters),
      include: {
        trackingEvents: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const byService: Record<string, number> = {};
    const byVendor: Record<string, number> = {};
    const adapterUsage: Record<string, number> = {};
    const simulatedByService: Record<string, number> = {};
    const supplyByService: Record<string, number> = {};
    const trendByDay: Record<string, Record<string, number>> = {};
    const byCountryService: Record<string, { count: number; awaitingPayment: number; failed: number; completed: number; completionMinutes: number[] }> = {};
    const byTenant: Record<string, { total: number; lastServiceType: string; awaitingPayment: number; failed: number; serviceCounts: Record<string, number> }> = {};
    const responseMinutes: number[] = [];
    const completionMinutes: number[] = [];
    let completed = 0;
    let failed = 0;

    // Geo aggregation state
    const byCity: Record<string, number> = {};
    const byCityService: Record<string, number> = {};
    const vendorsByCity: Record<string, Set<string>> = {};

    for (const request of requests) {
      byService[request.serviceType] = (byService[request.serviceType] ?? 0) + 1;
      if (request.vendorId) {
        byVendor[request.vendorId] = (byVendor[request.vendorId] ?? 0) + 1;
      }

      const routeData = this.toRecord(request.routeData);
      const adapterKey = typeof routeData.adapterKey === 'string' ? routeData.adapterKey : null;
      if (adapterKey) {
        adapterUsage[adapterKey] = (adapterUsage[adapterKey] ?? 0) + 1;
      }

      if (Boolean(routeData.simulationMode)) {
        simulatedByService[request.serviceType] = (simulatedByService[request.serviceType] ?? 0) + 1;
      }

      if (request.vendorId) {
        const supplyKey = `${request.serviceType}::${request.vendorId}`;
        supplyByService[supplyKey] = (supplyByService[supplyKey] ?? 0) + 1;
      }

      const day = this.dayKey(request.createdAt);
      trendByDay[day] = trendByDay[day] ?? {};
      trendByDay[day][request.serviceType] = (trendByDay[day][request.serviceType] ?? 0) + 1;

      const countryServiceKey = `${request.country}::${request.serviceType}`;
      byCountryService[countryServiceKey] = byCountryService[countryServiceKey] ?? {
        count: 0,
        awaitingPayment: 0,
        failed: 0,
        completed: 0,
        completionMinutes: [],
      };
      byCountryService[countryServiceKey].count += 1;
      if (request.status === 'AWAITING_PAYMENT') {
        byCountryService[countryServiceKey].awaitingPayment += 1;
      }
      if (request.status === 'FAILED') {
        byCountryService[countryServiceKey].failed += 1;
      }

      const tenantAggregate = byTenant[request.tenantId] ?? {
        total: 0,
        lastServiceType: request.serviceType,
        awaitingPayment: 0,
        failed: 0,
        serviceCounts: {},
      };
      byTenant[request.tenantId] = tenantAggregate;
      tenantAggregate.total += 1;
      tenantAggregate.lastServiceType = request.serviceType;
      tenantAggregate.serviceCounts[request.serviceType] = (tenantAggregate.serviceCounts[request.serviceType] ?? 0) + 1;
      if (request.status === 'AWAITING_PAYMENT') {
        tenantAggregate.awaitingPayment += 1;
      }
      if (request.status === 'FAILED') {
        tenantAggregate.failed += 1;
      }

      const lifecycle = this.requestLifecycleDurations(request);
      if (lifecycle.responseMinutes != null) {
        responseMinutes.push(lifecycle.responseMinutes);
      }
      if (lifecycle.completionMinutes != null) {
        completionMinutes.push(lifecycle.completionMinutes);
        byCountryService[countryServiceKey].completionMinutes.push(lifecycle.completionMinutes);
      }

      if (request.status === 'COMPLETED') {
        completed += 1;
        byCountryService[countryServiceKey].completed += 1;
      }
      if (request.status === 'FAILED') {
        failed += 1;
      }

      // Geo aggregation
      const reqCity = request.city ?? 'unknown';
      byCity[reqCity] = (byCity[reqCity] ?? 0) + 1;
      const citySvcKey = `${reqCity}::${request.serviceType}`;
      byCityService[citySvcKey] = (byCityService[citySvcKey] ?? 0) + 1;
      if (request.vendorId) {
        if (!vendorsByCity[reqCity]) vendorsByCity[reqCity] = new Set();
        vendorsByCity[reqCity].add(request.vendorId);
      }
    }

    // Geo post-processing
    const vendorCoverageByCity: Record<string, number> = {};
    for (const [geoCity, vendors] of Object.entries(vendorsByCity)) {
      vendorCoverageByCity[geoCity] = vendors.size;
    }

    const cityDemandValues = Object.values(byCity);
    const avgCityDemand = cityDemandValues.length > 0
      ? cityDemandValues.reduce((s, v) => s + v, 0) / cityDemandValues.length
      : 0;

    const serviceGapByCity = Object.entries(byCityService)
      .map(([key, demand]) => {
        const sepIdx = key.indexOf('::');
        const gapCity = key.slice(0, sepIdx);
        const gapService = key.slice(sepIdx + 2);
        const supply = vendorCoverageByCity[gapCity] ?? 0;
        return { city: gapCity, serviceType: gapService, demand, supply, gap: Math.max(0, demand - supply) };
      })
      .filter((entry) => entry.gap > 0)
      .sort((a, b) => b.gap - a.gap);

    const highDemandCities = Object.entries(byCity)
      .filter(([, count]) => count > avgCityDemand * 1.5)
      .map(([geoCity, requestCount]) => ({ city: geoCity, requestCount }))
      .sort((a, b) => b.requestCount - a.requestCount);

    const underServedCities = highDemandCities
      .filter(({ city: geoCity }) => (vendorCoverageByCity[geoCity] ?? 0) < 2)
      .map(({ city: geoCity, requestCount }) => ({
        city: geoCity,
        requestCount,
        vendorCount: vendorCoverageByCity[geoCity] ?? 0,
      }));

    const highFrictionZones = serviceGapByCity
      .filter((entry) => entry.demand >= 3)
      .slice(0, 10)
      .map((entry) => ({
        city: entry.city,
        serviceType: entry.serviceType,
        demand: entry.demand,
        vendorCoverage: vendorCoverageByCity[entry.city] ?? 0,
        frictionIndicator: entry.supply === 0 ? 'no-coverage' : 'under-served',
      }));

    return {
      filters: filters ?? {},
      policyContext,
      totals: {
        tickets: requests.length,
        active: requests.filter((request) => this.isActiveStatus(request.status)).length,
        completed,
        failed,
      },
      serviceMetrics: {
        ticketsByServiceType: byService,
      },
      timeMetrics: {
        averageResponseTimeMinutes: this.average(responseMinutes),
        averageCompletionTimeMinutes: this.average(completionMinutes),
      },
      vendorMetrics: {
        activityCounts: byVendor,
      },
      trends: {
        serviceVolumeByDay: Object.entries(trendByDay).map(([date, services]) => ({
          date,
          services,
        })),
      },
      recommendationSignals: {
        countryPainPoints: Object.entries(byCountryService).map(([key, signal]) => {
          const separatorIndex = key.indexOf('::');
          const countryCode = separatorIndex >= 0 ? key.slice(0, separatorIndex) : 'unknown';
          const serviceType = separatorIndex >= 0 ? key.slice(separatorIndex + 2) : 'unknown';
          return {
            countryCode,
            serviceType,
            requestVolume: signal.count,
            awaitingPaymentCount: signal.awaitingPayment,
            failedCount: signal.failed,
            completionRate: signal.count ? Number((signal.completed / signal.count).toFixed(4)) : 0,
            avgCompletionMinutes: this.average(signal.completionMinutes),
            frictionScore: (signal.awaitingPayment * 2) + (signal.failed * 3),
          };
        }).sort((a, b) => b.frictionScore - a.frictionScore),
        tenantNeedSignals: Object.entries(byTenant).map(([tenantId, signal]) => {
          const topService = Object.entries(signal.serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? signal.lastServiceType;
          return {
            tenantId,
            totalRequests: signal.total,
            awaitingPaymentCount: signal.awaitingPayment,
            failedCount: signal.failed,
            lastServiceType: signal.lastServiceType,
            likelyNextServiceHint: topService,
          };
        }).sort((a, b) => b.totalRequests - a.totalRequests),
        vendorLoadSignals: Object.entries(byVendor)
          .map(([vendorId, ticketCount]) => ({ vendorId, ticketCount }))
          .sort((a, b) => b.ticketCount - a.ticketCount),
        providerGapSignals: Object.entries(byService)
          .map(([serviceType, demandCount]) => {
            const supplyCount = Object.entries(supplyByService)
              .filter(([key]) => key.startsWith(`${serviceType}::`))
              .reduce((sum, [, count]) => sum + count, 0);
            return {
              serviceType,
              demandCount,
              supplyCount,
              gap: Math.max(0, demandCount - supplyCount),
            };
          })
          .sort((a, b) => b.gap - a.gap),
        adapterUsageFrequency: Object.entries(adapterUsage)
          .map(([adapterKey, usageCount]) => ({ adapterKey, usageCount }))
          .sort((a, b) => b.usageCount - a.usageCount),
        simulatedDemandVsSupply: Object.entries(byService).map(([serviceType, demandCount]) => ({
          serviceType,
          simulatedDemandCount: simulatedByService[serviceType] ?? 0,
          supplyCount: Object.entries(supplyByService)
            .filter(([key]) => key.startsWith(`${serviceType}::`))
            .reduce((sum, [, count]) => sum + count, 0),
          demandCount,
        })),
        geoSignals: {
          demandByCity: byCity,
          demandByServiceAndCity: byCityService,
          vendorCoverageByCity,
          serviceGapByCity,
        },
      },
      geoInsights: {
        highDemandCities,
        underServedCities,
        highFrictionZones,
      },
    };
  }

  async getDecisionSupportLayer(filters?: DashboardFilters) {
    const analysis = await this.getAnalysisLayer(filters);
    const recommendations = this.decisionSupportService.generateRecommendations({
      totals: analysis.totals,
      recommendationSignals: analysis.recommendationSignals,
    });

    return {
      filters: filters ?? {},
      generatedAt: new Date().toISOString(),
      totalRecommendations: recommendations.length,
      bySeverity: {
        critical: recommendations.filter((r) => r.severity === 'critical').length,
        high: recommendations.filter((r) => r.severity === 'high').length,
        medium: recommendations.filter((r) => r.severity === 'medium').length,
        low: recommendations.filter((r) => r.severity === 'low').length,
      },
      byCategory: recommendations.reduce<Record<string, number>>((acc, r) => {
        acc[r.category] = (acc[r.category] ?? 0) + 1;
        return acc;
      }, {}),
      recommendations,
    };
  }

  async getReportingLayer(filters?: DashboardFilters) {
    const policyContext = await this.operatorPolicyService.getRuntimePolicyContext(filters?.countryCode);
    const analysis = await this.getAnalysisLayer(filters);
    const recommendations = this.decisionSupportService.generateRecommendations({
      totals: analysis.totals,
      recommendationSignals: analysis.recommendationSignals,
    });

    const dailyTotals = analysis.trends.serviceVolumeByDay.map((day) => ({
      date: day.date,
      total: Object.values(day.services).reduce((sum, value) => sum + value, 0),
      services: day.services,
    }));

    const topServicesByVolume = Object.entries(analysis.serviceMetrics.ticketsByServiceType)
      .map(([serviceType, count]) => ({ serviceType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      filters: filters ?? {},
      policyContext,
      dailyCounts: dailyTotals,
      outcomes: {
        completed: analysis.totals.completed,
        failed: analysis.totals.failed,
      },
      topServicesByVolume,
      aiReadiness: {
        countryPainPoints: analysis.recommendationSignals.countryPainPoints.slice(0, 10),
        tenantNeedClusters: analysis.recommendationSignals.tenantNeedSignals.slice(0, 20),
        vendorLoadSignals: analysis.recommendationSignals.vendorLoadSignals.slice(0, 20),
        providerGapSignals: analysis.recommendationSignals.providerGapSignals.slice(0, 20),
        adapterUsageFrequency: analysis.recommendationSignals.adapterUsageFrequency.slice(0, 20),
        simulatedDemandVsSupply: analysis.recommendationSignals.simulatedDemandVsSupply.slice(0, 20),
      },
      decisionSupport: {
        totalRecommendations: recommendations.length,
        criticalCount: recommendations.filter((r) => r.severity === 'critical').length,
        highCount: recommendations.filter((r) => r.severity === 'high').length,
        topRecommendations: recommendations.slice(0, 10),
      },
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

    const activeTickets = requests.filter((request) => this.isActiveStatus(request.status)).length;
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
        activeTickets: vendorRequests.filter((request) => this.isActiveStatus(request.status)).length,
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
      include: {
        trackingEvents: true,
        user: { select: { fullName: true, phoneNumber: true } },
        payment: {
          select: {
            id: true,
            amountMinor: true,
            currency: true,
            status: true,
          },
        },
        viewingRequest: {
          include: {
            items: { include: { property: { select: { id: true, title: true, city: true, district: true } } } },
            assignment: { include: { provider: { select: { id: true, name: true, city: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async assignProvider(actorUserId: string, requestId: string, providerId: string) {
    const { changed, request } = await this.orchestratorService.assignProviderToUnifiedRequest({
      requestId,
      providerId,
      actorUserId,
    });
    if (changed) {
      this.unifiedRequestsService.emitProviderAssignmentSockets(request, providerId);
    }
    return request;
  }

  async reassignProvider(actorUserId: string, requestId: string, providerId: string, reason?: string) {
    const { changed, request } = await this.orchestratorService.reassignProviderFromCommandCenter({
      requestId,
      providerId,
      actorUserId,
      reason,
    });
    if (changed) {
      this.unifiedRequestsService.emitProviderAssignmentSockets(request, providerId);
    }
    return request;
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

  dispatchInstruction(actorUserId: string, requestId: string, instructionType: string, payload?: Record<string, unknown>) {
    return this.orchestratorService.dispatchInstruction(requestId, instructionType, payload, actorUserId);
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

  /** Command-center inventory read: all lifecycle statuses + maintenance-hold operational context. */
  async listPropertiesForCommandCenter(query?: { countryCode?: string }) {
    const raw = query?.countryCode?.trim();
    const countryCode = raw ? raw.toUpperCase() : undefined;
    const properties = await this.prisma.property.findMany({
      where: countryCode ? { countryCode } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        title: true,
        city: true,
        district: true,
        countryCode: true,
        status: true,
        propertyType: true,
        slug: true,
        createdAt: true,
      },
    });

    const propertyIds = properties.map((p) => p.id);
    if (propertyIds.length === 0) return properties.map((p) => ({ ...p, maintenanceHold: null }));

    const activeHolds = await this.prisma.maintenanceRequest.findMany({
      where: {
        propertyId: { in: propertyIds },
        metadata: {
          path: ['maintenanceHold', 'active'],
          equals: true,
        },
      },
      include: {
        unifiedRequest: {
          select: {
            id: true,
            status: true,
            vendorId: true,
            paymentStatus: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const holdByProperty = new Map<string, (typeof activeHolds)[number]>();
    for (const hold of activeHolds) {
      if (!hold.propertyId) continue;
      if (!holdByProperty.has(hold.propertyId)) {
        holdByProperty.set(hold.propertyId, hold);
      }
    }

    return properties.map((property) => {
      const hold = holdByProperty.get(property.id);
      if (!hold) {
        return {
          ...property,
          maintenanceHold: null,
        };
      }

      const unifiedStatus = hold.unifiedRequest.status;
      const requestTerminal = ['COMPLETED', 'CANCELLED', 'REJECTED', 'FAILED'].includes(unifiedStatus);
      const releaseAllowed = !requestTerminal;
      const nextAction = releaseAllowed
        ? (hold.providerId || hold.unifiedRequest.vendorId ? 'Monitor execution and release hold when work is done' : 'Assign provider and start execution')
        : 'Review terminal maintenance workflow before hold release';

      return {
        ...property,
        maintenanceHold: {
          active: true,
          maintenanceRequestId: hold.id,
          maintenanceRequestStatus: hold.status,
          unifiedRequestId: hold.unifiedRequestId,
          unifiedRequestStatus: unifiedStatus,
          assignedProviderId: hold.providerId ?? hold.unifiedRequest.vendorId ?? null,
          category: hold.category,
          severity: hold.severity,
          releaseAllowed,
          nextAction,
        },
      };
    });
  }

  private bookingPaymentSettled(
    payments: Array<{ status: PaymentStatus }>,
    unifiedRequest: { paymentStatus: PaymentStatus } | null,
  ): boolean {
    const viaBooking = payments.some((p) => p.status === 'SUCCEEDED' || p.status === 'WAIVED');
    const viaRequest = unifiedRequest
      ? unifiedRequest.paymentStatus === 'SUCCEEDED' || unifiedRequest.paymentStatus === 'WAIVED'
      : false;
    return viaBooking || viaRequest;
  }

  private bookingContractReady(snapshot: {
    payments: Array<{ status: PaymentStatus }>;
    unifiedRequest: { paymentStatus: PaymentStatus } | null;
    confirmedAt: Date | null;
    termMonths: number;
  }): boolean {
    if (!this.bookingPaymentSettled(snapshot.payments, snapshot.unifiedRequest)) {
      return false;
    }
    if (!snapshot.confirmedAt) {
      return false;
    }
    return snapshot.termMonths > 0;
  }

  /**
   * Command-center booking read model: lifecycle + inventory projection + readiness + guidance.
   * Aligns with booking command validation (Phases 1–3A); does not execute commands.
   */
  private buildBookingCommandCenterOperationalRow(row: {
    id: string;
    status: BookingStatus;
    moveInDate: Date;
    termMonths: number;
    confirmedAt: Date | null;
    unifiedRequestId: string | null;
    createdAt: Date;
    updatedAt: Date;
    totalAmountMinor: number;
    securityDepositMinor: number;
    currency: string;
    tenant: { id: string; fullName: string };
    property: { id: string; title: string; city: string; countryCode: string; status: PropertyStatus };
    payments: Array<{ status: PaymentStatus }>;
    unifiedRequest: { paymentStatus: PaymentStatus } | null;
  }) {
    const paymentSettled = this.bookingPaymentSettled(row.payments, row.unifiedRequest);
    const contractReady = this.bookingContractReady({
      payments: row.payments,
      unifiedRequest: row.unifiedRequest,
      confirmedAt: row.confirmedAt,
      termMonths: row.termMonths,
    });

    let occupancyState: { code: string; label: string };
    if (row.status === 'CANCELLED') {
      occupancyState = { code: 'CANCELLED', label: 'Cancelled — no active lease' };
    } else if (row.status === 'COMPLETED') {
      occupancyState = { code: 'POST_LEASE', label: 'Lease completed (booking truth)' };
    } else if (row.status === 'ACTIVE') {
      occupancyState =
        row.property.status === 'OCCUPIED'
          ? { code: 'UNDER_ACTIVE_LEASE', label: 'Occupied under active lease' }
          : { code: 'ACTIVE_PROJECTION_MISMATCH', label: 'Active lease but property is not OCCUPIED' };
    } else {
      occupancyState = { code: 'PRE_ACTIVE_LEASE', label: 'Not yet in active occupancy phase' };
    }

    let nextAction = '';
    let blockingReason: string | null = null;

    switch (row.status) {
      case 'DRAFT':
        nextAction = 'Resolve draft booking via operational intake (no command-center booking commands yet).';
        blockingReason = 'Booking is DRAFT; command-center booking commands are not defined for this state.';
        break;
      case 'RESERVED':
        if (!paymentSettled) {
          blockingReason = 'Payment not settled (SUCCEEDED or WAIVED required before confirm).';
          nextAction = 'Collect or record successful payment, then confirm booking.';
        } else if (row.property.status === 'RESERVED') {
          blockingReason = 'Property is under operational reserve; release reserve before confirm.';
          nextAction = 'Release property reserve, then confirm booking.';
        } else if (row.property.status === 'INACTIVE') {
          blockingReason = 'Property is hidden/inactive; republish before confirm.';
          nextAction = 'Republish property, then confirm booking.';
        } else if (row.property.status === 'OCCUPIED') {
          blockingReason = 'Property is OCCUPIED; cannot confirm booking.';
          nextAction = 'Reconcile occupancy conflict before confirm.';
        } else {
          nextAction = 'Run confirm-booking command when operationally ready.';
        }
        break;
      case 'CONFIRMED':
        if (!contractReady) {
          if (!paymentSettled) {
            blockingReason = 'Contract readiness: payment not settled.';
          } else if (!row.confirmedAt) {
            blockingReason = 'Contract readiness: booking not confirmed (missing confirmedAt).';
          } else if (row.termMonths <= 0) {
            blockingReason = 'Contract readiness: invalid term (termMonths must be > 0).';
          }
          nextAction = 'Fix readiness blockers, then move to contract pending.';
        } else if (row.property.status === 'RESERVED') {
          blockingReason = 'Property is under operational reserve; release reserve before contract pending.';
          nextAction = 'Release reserve, then move to contract pending.';
        } else {
          nextAction = 'Run contract-pending command.';
        }
        break;
      case 'CONTRACT_PENDING':
        if (!contractReady) {
          blockingReason = 'Contract readiness failed; check payment, confirmation, and term.';
          nextAction = 'Resolve readiness, then activate lease.';
        } else if (row.moveInDate.getTime() > Date.now()) {
          blockingReason = 'Move-in date not reached; activation blocked until on or after move-in date.';
          nextAction = 'Wait until move-in date, then run activate-lease command.';
        } else if (row.property.status === 'RESERVED' || row.property.status === 'INACTIVE') {
          blockingReason = `Property status ${row.property.status} blocks lease activation.`;
          nextAction = 'Resolve property state (reserve/hide), then activate lease.';
        } else {
          nextAction = 'Run activate-lease command.';
        }
        break;
      case 'ACTIVE':
        if (row.property.status !== 'OCCUPIED') {
          blockingReason = 'Booking is ACTIVE but property is not OCCUPIED; inventory projection must be reconciled.';
          nextAction = 'Reconcile property projection, then manage end-of-lease completion.';
        } else {
          nextAction = 'At end of tenancy, run complete-lease command.';
        }
        break;
      case 'COMPLETED':
        if (row.property.status === 'OCCUPIED') {
          blockingReason = 'Booking is COMPLETED but property is still OCCUPIED; data inconsistency.';
          nextAction = 'Reconcile inventory projection (complete-lease should have released OCCUPIED).';
        } else {
          nextAction = 'No further booking commands; monitor post-lease / settlement workflows when enabled.';
        }
        break;
      case 'CANCELLED':
        nextAction = 'No active booking operations.';
        break;
      default:
        nextAction = 'Review booking status.';
        blockingReason = `Unhandled booking status: ${row.status}`;
    }

    return {
      id: row.id,
      bookingStatus: row.status,
      moveInDate: row.moveInDate,
      termMonths: row.termMonths,
      confirmedAt: row.confirmedAt,
      unifiedRequestId: row.unifiedRequestId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      totalAmountMinor: row.totalAmountMinor,
      securityDepositMinor: row.securityDepositMinor,
      currency: row.currency,
      tenant: row.tenant,
      property: row.property,
      paymentReadiness: {
        settled: paymentSettled,
        summary: paymentSettled ? 'SETTLED' : 'NOT_SETTLED',
      },
      contractReadiness: { ready: contractReady },
      occupancyState,
      nextAction,
      blockingReason,
    };
  }

  async listBookingsForCommandCenter(query?: { countryCode?: string }) {
    const raw = query?.countryCode?.trim();
    const countryCode = raw ? raw.toUpperCase() : undefined;
    const rows = await this.prisma.booking.findMany({
      where: countryCode ? { property: { countryCode } } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        status: true,
        moveInDate: true,
        termMonths: true,
        confirmedAt: true,
        unifiedRequestId: true,
        createdAt: true,
        updatedAt: true,
        totalAmountMinor: true,
        securityDepositMinor: true,
        currency: true,
        tenant: { select: { id: true, fullName: true } },
        property: { select: { id: true, title: true, city: true, countryCode: true, status: true } },
        payments: { select: { status: true } },
        unifiedRequest: { select: { paymentStatus: true } },
      },
    });

    return rows.map((r) => this.buildBookingCommandCenterOperationalRow(r));
  }
}