import { Injectable } from '@nestjs/common';

export type RecommendationCategory = 'vendor' | 'service' | 'policy' | 'financial' | 'adapter' | 'tenant';
export type RecommendationSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ActionableRecommendation {
  id: string;
  category: RecommendationCategory;
  severity: RecommendationSeverity;
  title: string;
  rationale: string;
  suggestedAction: string;
  signal: Record<string, unknown>;
  autoResolvable: boolean;
}

type CountryPainPoint = {
  countryCode: string;
  serviceType: string;
  requestVolume: number;
  frictionScore: number;
  completionRate: number;
  avgCompletionMinutes: number;
  awaitingPaymentCount: number;
  failedCount: number;
};

type TenantNeedSignal = {
  tenantId: string;
  totalRequests: number;
  awaitingPaymentCount: number;
  failedCount: number;
  lastServiceType: string;
  likelyNextServiceHint: string;
};

type VendorLoadSignal = {
  vendorId: string;
  ticketCount: number;
};

type ProviderGapSignal = {
  serviceType: string;
  demandCount: number;
  supplyCount: number;
  gap: number;
};

type SimulatedDemandEntry = {
  serviceType: string;
  simulatedDemandCount: number;
  supplyCount: number;
  demandCount: number;
};

type CityGapEntry = {
  city: string;
  serviceType: string;
  demand: number;
  supply: number;
  gap: number;
};

type AnalysisSignals = {
  totals: { tickets: number; active: number; completed: number; failed: number };
  recommendationSignals: {
    countryPainPoints: CountryPainPoint[];
    tenantNeedSignals: TenantNeedSignal[];
    vendorLoadSignals: VendorLoadSignal[];
    providerGapSignals: ProviderGapSignal[];
    simulatedDemandVsSupply: SimulatedDemandEntry[];
    geoSignals?: {
      demandByCity: Record<string, number>;
      vendorCoverageByCity: Record<string, number>;
      serviceGapByCity: CityGapEntry[];
    };
  };
};

const SEVERITY_ORDER: Record<RecommendationSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

@Injectable()
export class DecisionSupportService {
  generateRecommendations(signals: AnalysisSignals): ActionableRecommendation[] {
    const recommendations: ActionableRecommendation[] = [];

    this.evaluateVendorLoad(signals, recommendations);
    this.evaluateServiceGaps(signals, recommendations);
    this.evaluateCountryFriction(signals, recommendations);
    this.evaluateAdapterSimulationGaps(signals, recommendations);
    this.evaluateTenantPaymentStalls(signals, recommendations);
    this.evaluateLowCompletionRates(signals, recommendations);
    this.evaluateFailureSpikes(signals, recommendations);
    this.evaluateCityProviderGaps(signals, recommendations);

    return recommendations.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  }

  private evaluateVendorLoad(signals: AnalysisSignals, out: ActionableRecommendation[]) {
    const loads = signals.recommendationSignals.vendorLoadSignals;
    if (!loads.length) return;

    const avg = loads.reduce((sum, v) => sum + v.ticketCount, 0) / loads.length;
    const overloaded = loads.filter((v) => v.ticketCount > avg * 2.5);

    for (const vendor of overloaded) {
      const ratio = avg > 0 ? vendor.ticketCount / avg : 0;
      const severity: RecommendationSeverity = ratio >= 4 ? 'critical' : ratio >= 3 ? 'high' : 'medium';

      out.push({
        id: `vendor-overload::${vendor.vendorId}`,
        category: 'vendor',
        severity,
        title: `Vendor overloaded: ${vendor.vendorId}`,
        rationale: `Vendor carries ${vendor.ticketCount} tickets vs platform average of ${Math.round(avg)}. Load ratio: ${ratio.toFixed(1)}x.`,
        suggestedAction: 'Reassign pending tickets to lower-load vendors or activate a new provider for this service type.',
        signal: { vendorId: vendor.vendorId, ticketCount: vendor.ticketCount, platformAvg: Math.round(avg) },
        autoResolvable: false,
      });
    }
  }

  private evaluateServiceGaps(signals: AnalysisSignals, out: ActionableRecommendation[]) {
    for (const gap of signals.recommendationSignals.providerGapSignals) {
      if (gap.gap <= 0) continue;

      const ratio = gap.supplyCount > 0 ? gap.demandCount / gap.supplyCount : Infinity;
      const severity: RecommendationSeverity = gap.supplyCount === 0
        ? (gap.demandCount >= 5 ? 'critical' : 'high')
        : (ratio >= 3 ? 'high' : 'medium');

      out.push({
        id: `service-gap::${gap.serviceType}`,
        category: 'service',
        severity,
        title: `Supply gap detected: ${gap.serviceType}`,
        rationale: `${gap.demandCount} demand tickets vs ${gap.supplyCount} provider-assigned tickets. Unmet demand gap: ${gap.gap}.`,
        suggestedAction: `Recruit or activate providers for "${gap.serviceType}". Consider enabling fallback provider routing for this service type in country policy.`,
        signal: { serviceType: gap.serviceType, demandCount: gap.demandCount, supplyCount: gap.supplyCount, gap: gap.gap },
        autoResolvable: false,
      });
    }
  }

  private evaluateCountryFriction(signals: AnalysisSignals, out: ActionableRecommendation[]) {
    for (const point of signals.recommendationSignals.countryPainPoints) {
      if (point.frictionScore < 5) continue;

      const severity: RecommendationSeverity = point.frictionScore >= 20 ? 'critical'
        : point.frictionScore >= 10 ? 'high'
        : 'medium';

      out.push({
        id: `country-friction::${point.countryCode}::${point.serviceType}`,
        category: 'policy',
        severity,
        title: `High friction: ${point.serviceType} in ${point.countryCode}`,
        rationale: `Friction score ${point.frictionScore} — ${point.awaitingPaymentCount} payment stalls and ${point.failedCount} failures across ${point.requestVolume} requests. Completion rate: ${(point.completionRate * 100).toFixed(0)}%.`,
        suggestedAction: `Review service rules for "${point.serviceType}" in ${point.countryCode}. Adjust pricing thresholds, SLA windows, or free-service caps.`,
        signal: {
          countryCode: point.countryCode,
          serviceType: point.serviceType,
          frictionScore: point.frictionScore,
          awaitingPaymentCount: point.awaitingPaymentCount,
          failedCount: point.failedCount,
          requestVolume: point.requestVolume,
          completionRate: point.completionRate,
        },
        autoResolvable: false,
      });
    }
  }

  private evaluateAdapterSimulationGaps(signals: AnalysisSignals, out: ActionableRecommendation[]) {
    for (const entry of signals.recommendationSignals.simulatedDemandVsSupply) {
      if (entry.simulatedDemandCount <= 0) continue;
      if (entry.supplyCount > 0) continue; // real supply present — simulation is acceptable fallback

      const severity: RecommendationSeverity = entry.demandCount >= 5 ? 'high' : 'medium';

      out.push({
        id: `adapter-sim-gap::${entry.serviceType}`,
        category: 'adapter',
        severity,
        title: `Simulation-only supply: ${entry.serviceType}`,
        rationale: `${entry.simulatedDemandCount} requests served by simulated adapter only — no real provider assigned. Total demand: ${entry.demandCount}.`,
        suggestedAction: `Activate a real provider adapter for "${entry.serviceType}". Register provider credentials and endpoint in AdapterConfig to graduate from simulation.`,
        signal: {
          serviceType: entry.serviceType,
          simulatedDemandCount: entry.simulatedDemandCount,
          supplyCount: entry.supplyCount,
          demandCount: entry.demandCount,
        },
        autoResolvable: false,
      });
    }
  }

  private evaluateTenantPaymentStalls(signals: AnalysisSignals, out: ActionableRecommendation[]) {
    const STALL_THRESHOLD = 2;

    for (const tenant of signals.recommendationSignals.tenantNeedSignals) {
      if (tenant.awaitingPaymentCount < STALL_THRESHOLD) continue;

      const severity: RecommendationSeverity = tenant.awaitingPaymentCount >= 4 ? 'high' : 'medium';

      out.push({
        id: `tenant-payment-stall::${tenant.tenantId}`,
        category: 'tenant',
        severity,
        title: `Payment stall: tenant ${tenant.tenantId}`,
        rationale: `Tenant has ${tenant.awaitingPaymentCount} requests stuck in AWAITING_PAYMENT out of ${tenant.totalRequests} total service requests.`,
        suggestedAction: 'Send a payment reminder to this tenant. Verify payment method and check for outstanding invoice blocks.',
        signal: {
          tenantId: tenant.tenantId,
          awaitingPaymentCount: tenant.awaitingPaymentCount,
          totalRequests: tenant.totalRequests,
          lastServiceType: tenant.lastServiceType,
        },
        autoResolvable: false,
      });
    }
  }

  private evaluateLowCompletionRates(signals: AnalysisSignals, out: ActionableRecommendation[]) {
    const MIN_VOLUME = 3;
    const MIN_COMPLETION_RATE = 0.5;

    for (const point of signals.recommendationSignals.countryPainPoints) {
      if (point.requestVolume < MIN_VOLUME) continue;
      if (point.completionRate >= MIN_COMPLETION_RATE) continue;

      // avoid duplicate if already flagged by friction evaluator
      const alreadyFlagged = out.some((r) => r.id === `country-friction::${point.countryCode}::${point.serviceType}`);
      if (alreadyFlagged && point.frictionScore >= 5) continue;

      const severity: RecommendationSeverity = point.completionRate < 0.2 ? 'high' : 'medium';

      out.push({
        id: `low-completion::${point.countryCode}::${point.serviceType}`,
        category: 'service',
        severity,
        title: `Low completion rate: ${point.serviceType} in ${point.countryCode}`,
        rationale: `Completion rate is ${(point.completionRate * 100).toFixed(0)}% across ${point.requestVolume} requests. Avg resolution: ${point.avgCompletionMinutes} min.`,
        suggestedAction: `Audit recent failed/stalled tickets for "${point.serviceType}" in ${point.countryCode}. Review vendor assignment rules and SLA thresholds.`,
        signal: {
          countryCode: point.countryCode,
          serviceType: point.serviceType,
          completionRate: point.completionRate,
          requestVolume: point.requestVolume,
          avgCompletionMinutes: point.avgCompletionMinutes,
        },
        autoResolvable: false,
      });
    }
  }

  private evaluateFailureSpikes(signals: AnalysisSignals, out: ActionableRecommendation[]) {
    const { totals } = signals;
    if (totals.tickets < 5) return;

    const failureRate = totals.failed / totals.tickets;
    if (failureRate < 0.2) return;

    const severity: RecommendationSeverity = failureRate >= 0.4 ? 'critical' : 'high';

    out.push({
      id: 'platform-failure-spike',
      category: 'service',
      severity,
      title: 'Platform failure spike detected',
      rationale: `${totals.failed} failed requests out of ${totals.tickets} total — ${(failureRate * 100).toFixed(0)}% failure rate across all service types.`,
      suggestedAction: 'Investigate failure causes across service types. Cross-reference with vendor activity, policy changes, and recent deployments.',
      signal: { failed: totals.failed, total: totals.tickets, failureRate: Number(failureRate.toFixed(4)) },
      autoResolvable: false,
    });
  }

  private evaluateCityProviderGaps(signals: AnalysisSignals, out: ActionableRecommendation[]) {
    const geo = signals.recommendationSignals.geoSignals;
    if (!geo?.serviceGapByCity?.length) return;

    const { demandByCity, vendorCoverageByCity, serviceGapByCity } = geo;

    const cityDemandValues = Object.values(demandByCity);
    const avgCityDemand = cityDemandValues.length > 0
      ? cityDemandValues.reduce((s, v) => s + v, 0) / cityDemandValues.length
      : 0;

    for (const entry of serviceGapByCity) {
      if (entry.gap <= 0 || entry.demand < 2) continue;

      const cityTotalDemand = demandByCity[entry.city] ?? 0;
      const vendorCount = vendorCoverageByCity[entry.city] ?? 0;
      const isHighDemandCity = cityTotalDemand > avgCityDemand * 1.5;

      const severity: RecommendationSeverity =
        vendorCount === 0 && isHighDemandCity ? 'critical'
        : vendorCount === 0 || isHighDemandCity ? 'high'
        : 'medium';

      out.push({
        id: `city-gap::${entry.city}::${entry.serviceType}`,
        category: 'service',
        severity,
        title: `Provider gap in ${entry.city}: ${entry.serviceType}`,
        rationale: `${entry.demand} demand requests in ${entry.city} for "${entry.serviceType}" with only ${vendorCount} active vendor(s). Unmet gap: ${entry.gap}.`,
        suggestedAction: `Add providers in ${entry.city} for "${entry.serviceType}". City total demand: ${cityTotalDemand} (platform avg: ${Math.round(avgCityDemand)}).`,
        signal: {
          city: entry.city,
          serviceType: entry.serviceType,
          demand: entry.demand,
          vendorCount,
          gap: entry.gap,
          cityTotalDemand,
          platformAvgDemand: Math.round(avgCityDemand),
        },
        autoResolvable: false,
      });
    }
  }
}
