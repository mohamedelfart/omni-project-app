import { Injectable } from '@nestjs/common';
import { FreeServiceEngineService } from '../free-service-engine/free-service-engine.service';
import { OperatorPolicyService } from '../operator-policy/operator-policy.service';
import { PrismaService } from '../prisma/prisma.service';

export type TenantJourneyStage =
  | 'new-to-platform'
  | 'browsing'
  | 'post-viewing'
  | 'moving-in'
  | 'settled'
  | 'recurring';

export interface TenantServiceRecommendation {
  serviceType: string;
  displayName: string;
  tagline: string;
  badge: 'free' | 'priority' | 'suggested' | 'new';
  score: number;
  freeCapMinor: number;
  remainingFreeMinor: number | null;
  currency: string;
  reason: string;
  navigateTo: string;
}

export interface TenantJourneyContext {
  stage: TenantJourneyStage;
  recentServiceTypes: string[];
  hasActiveRequests: boolean;
  totalRequests: number;
  lastServiceType: string | null;
  city: string | null;
}

export interface TenantRecommendationsResponse {
  countryCode: string;
  currency: string;
  journeyContext: TenantJourneyContext;
  top: TenantServiceRecommendation[];
  all: TenantServiceRecommendation[];
  freeServiceHighlight: string | null;
  policyAware: boolean;
  generatedAt: string;
}

const DISPLAY_NAMES: Record<string, string> = {
  'move-in': 'Move-In Service',
  'cleaning': 'Cleaning',
  'maintenance': 'Maintenance',
  'viewing-transport': 'Property Viewing',
  'airport-transfer': 'Airport Transfer',
  'grocery-delivery': 'Grocery Delivery',
  'paid': 'Premium Services',
};

const TAGLINES: Record<string, string> = {
  'move-in': 'Professional moving, covered by your package',
  'cleaning': 'Keep your home spotless, anytime',
  'maintenance': 'Priority repair and SLA visibility',
  'viewing-transport': 'Routed transport to shortlisted properties',
  'airport-transfer': 'Seamless arrival and departure coordination',
  'grocery-delivery': 'Essentials delivered to your door',
  'paid': 'Ride, food, laundry, and lifestyle services',
};

const NAVIGATE_TO: Record<string, string> = {
  'move-in': 'MoveIn',
  'cleaning': 'Cleaning',
  'maintenance': 'Maintenance',
  'viewing-transport': 'ViewingRequest',
  'airport-transfer': 'AirportTransfer',
  'grocery-delivery': 'PaidServices',
  'paid': 'PaidServices',
};

const ACTIVE_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'QUEUED', 'ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS', 'AWAITING_PAYMENT', 'ESCALATED'];
const COMPLETED_STATUS = 'COMPLETED';
const RECENT_DAYS = 30;
const HISTORY_LIMIT = 50;

@Injectable()
export class TenantIntelligenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operatorPolicyService: OperatorPolicyService,
    private readonly freeServiceEngine: FreeServiceEngineService,
  ) {}

  async getRecommendations(userId: string, countryCode?: string): Promise<TenantRecommendationsResponse> {
    const policyContext = await this.operatorPolicyService.getRuntimePolicyContext(countryCode);
    const activeCountryCode = policyContext.selectedCountryCode;
    const currency = policyContext.countryConfig.defaultCurrency;
    const serviceRules = policyContext.serviceRules;

    const cutoff = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000);
    const recentRequests = await this.prisma.unifiedRequest.findMany({
      where: {
        tenantId: userId,
        createdAt: { gte: cutoff },
      },
      select: { serviceType: true, status: true, createdAt: true, city: true },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    });

    const journeyContext = this.inferJourneyContext(recentRequests);

    // Resolve free-service usage for hybrid services (move-in is the main one)
    const hybridServices = serviceRules.filter((r) => r.enabled && r.category === 'hybrid' && r.freeCapMinor > 0);
    const usageByServiceType = new Map<string, number>();
    for (const rule of hybridServices) {
      const usage = await this.freeServiceEngine.getUsageSummary({
        userId,
        serviceType: rule.serviceType,
        countryCode: activeCountryCode,
      });
      usageByServiceType.set(rule.serviceType, usage.remainingFreeMinor);
    }

    const enabledRules = serviceRules.filter((r) => r.enabled);
    const scored = enabledRules.map((rule) =>
      this.scoreService(rule, journeyContext, recentRequests, usageByServiceType, currency, journeyContext.city),
    );

    scored.sort((a, b) => b.score - a.score);

    const freeServiceHighlight = this.buildFreeHighlight(usageByServiceType, currency);

    return {
      countryCode: activeCountryCode,
      currency,
      journeyContext,
      top: scored.slice(0, 3),
      all: scored,
      freeServiceHighlight,
      policyAware: true,
      generatedAt: new Date().toISOString(),
    };
  }

  private inferJourneyContext(
    requests: Array<{ serviceType: string; status: string; createdAt: Date; city: string | null }>,
  ): TenantJourneyContext {
    const total = requests.length;
    const activeRequests = requests.filter((r) => ACTIVE_STATUSES.includes(r.status));
    const recentServiceTypes = [...new Set(requests.map((r) => r.serviceType))];
    const lastServiceType = requests[0]?.serviceType ?? null;

    const hasViewingTransport = requests.some((r) => r.serviceType === 'viewing-transport');
    const hasCompletedViewing = requests.some((r) => r.serviceType === 'viewing-transport' && r.status === COMPLETED_STATUS);
    const hasMoveIn = requests.some((r) => r.serviceType === 'move-in');
    const hasCompletedMoveIn = requests.some((r) => r.serviceType === 'move-in' && r.status === COMPLETED_STATUS);
    const recurringCount = requests.filter((r) => r.serviceType === 'cleaning' || r.serviceType === 'maintenance').length;

    let stage: TenantJourneyStage = 'new-to-platform';
    if (total === 0) {
      stage = 'new-to-platform';
    } else if (hasCompletedMoveIn && recurringCount >= 2) {
      stage = 'recurring';
    } else if (hasCompletedMoveIn) {
      stage = 'settled';
    } else if (hasMoveIn) {
      stage = 'moving-in';
    } else if (hasCompletedViewing || hasViewingTransport) {
      stage = 'post-viewing';
    } else {
      stage = 'browsing';
    }

    const primaryCityCounts: Record<string, number> = {};
    for (const r of requests) {
      if (r.city) primaryCityCounts[r.city] = (primaryCityCounts[r.city] ?? 0) + 1;
    }
    const inferredCity = Object.entries(primaryCityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      stage,
      recentServiceTypes,
      hasActiveRequests: activeRequests.length > 0,
      totalRequests: total,
      lastServiceType,
      city: inferredCity,
    };
  }

  private scoreService(
    rule: { serviceType: string; category: string; freeCapMinor: number; basePriceMinor: number },
    journeyContext: TenantJourneyContext,
    recentRequests: Array<{ serviceType: string; status: string; createdAt: Date; city: string | null }>,
    usageByServiceType: Map<string, number>,
    currency: string,
    tenantCity: string | null,
  ): TenantServiceRecommendation {
    let score = 10; // base for enabled service

    // Free/hybrid relevance boost
    if (rule.category === 'free') {
      score += 15;
    } else if (rule.category === 'hybrid' && rule.freeCapMinor > 0) {
      const remaining = usageByServiceType.get(rule.serviceType);
      if (remaining !== undefined && remaining > 0) {
        score += 20; // still has free balance — highly relevant
      } else if (remaining === 0) {
        score -= 5; // cap exhausted — lower priority
      }
    }

    // Journey-stage boosts
    const { stage } = journeyContext;
    score += this.journeyStageBoost(rule.serviceType, stage);

    // Recency penalty: if used in last 7 days and completed, reduce score
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCompleted = recentRequests.filter(
      (r) => r.serviceType === rule.serviceType && r.status === COMPLETED_STATUS && r.createdAt >= sevenDaysAgo,
    );
    if (recentCompleted.length > 0) {
      score -= 8;
    }

    // Active request for this type: deprioritize (already in flight)
    const hasActive = recentRequests.some(
      (r) => r.serviceType === rule.serviceType && ACTIVE_STATUSES.includes(r.status),
    );
    if (hasActive) {
      score -= 12;
    }

    // City popularity boost: if tenant has used this service in their primary city, it's locally relevant
    if (tenantCity) {
      const cityUsageCount = recentRequests.filter(
        (r) => r.serviceType === rule.serviceType && r.city === tenantCity,
      ).length;
      if (cityUsageCount >= 2) {
        score += 6; // recurring city-local service
      } else if (cityUsageCount === 1) {
        score += 3; // tried in city — mild boost
      }
    }

    const remainingFreeMinor = usageByServiceType.has(rule.serviceType)
      ? (usageByServiceType.get(rule.serviceType) ?? null)
      : rule.category === 'free' ? null : null;

    const badge = this.selectBadge(rule, journeyContext, usageByServiceType);
    const reason = this.buildReason(rule, journeyContext, usageByServiceType, currency);

    return {
      serviceType: rule.serviceType,
      displayName: DISPLAY_NAMES[rule.serviceType] ?? rule.serviceType,
      tagline: TAGLINES[rule.serviceType] ?? 'Available service',
      badge,
      score: Math.max(0, score),
      freeCapMinor: rule.freeCapMinor,
      remainingFreeMinor,
      currency,
      reason,
      navigateTo: NAVIGATE_TO[rule.serviceType] ?? 'ServicesHub',
    };
  }

  private journeyStageBoost(serviceType: string, stage: TenantJourneyStage): number {
    const boosts: Record<TenantJourneyStage, Record<string, number>> = {
      'new-to-platform': {
        'viewing-transport': 30,
        'move-in': 10,
      },
      'browsing': {
        'viewing-transport': 30,
        'move-in': 15,
        'airport-transfer': 5,
      },
      'post-viewing': {
        'move-in': 30,
        'airport-transfer': 20,
        'cleaning': 10,
      },
      'moving-in': {
        'cleaning': 25,
        'maintenance': 15,
        'airport-transfer': 10,
        'grocery-delivery': 10,
      },
      'settled': {
        'maintenance': 20,
        'cleaning': 20,
        'grocery-delivery': 15,
        'airport-transfer': 10,
      },
      'recurring': {
        'maintenance': 30,
        'cleaning': 25,
        'grocery-delivery': 15,
      },
    };

    return boosts[stage]?.[serviceType] ?? 0;
  }

  private selectBadge(
    rule: { serviceType: string; category: string; freeCapMinor: number },
    journeyContext: TenantJourneyContext,
    usageByServiceType: Map<string, number>,
  ): TenantServiceRecommendation['badge'] {
    if (rule.category === 'free') return 'free';
    if (rule.category === 'hybrid' && rule.freeCapMinor > 0) {
      const remaining = usageByServiceType.get(rule.serviceType);
      if (remaining !== undefined && remaining > 0) return 'free';
    }
    const stagePriorityServices: Record<TenantJourneyStage, string[]> = {
      'new-to-platform': ['viewing-transport'],
      'browsing': ['viewing-transport'],
      'post-viewing': ['move-in'],
      'moving-in': ['cleaning'],
      'settled': ['maintenance', 'cleaning'],
      'recurring': ['maintenance'],
    };
    const priorityList = stagePriorityServices[journeyContext.stage] ?? [];
    if (priorityList.includes(rule.serviceType)) return 'priority';
    if (!journeyContext.recentServiceTypes.includes(rule.serviceType)) return 'new';
    return 'suggested';
  }

  private buildReason(
    rule: { serviceType: string; category: string; freeCapMinor: number },
    journeyContext: TenantJourneyContext,
    usageByServiceType: Map<string, number>,
    currency: string,
  ): string {
    if (rule.category === 'free') {
      return `${DISPLAY_NAMES[rule.serviceType] ?? rule.serviceType} is fully covered by your plan.`;
    }
    if (rule.category === 'hybrid' && rule.freeCapMinor > 0) {
      const remaining = usageByServiceType.get(rule.serviceType);
      if (remaining !== undefined && remaining > 0) {
        return `You have ${currency} ${(remaining / 100).toFixed(0)} free balance remaining for this service.`;
      }
      return `Your free allowance for this service has been used. Pay-as-you-go pricing applies.`;
    }
    const stageReasons: Partial<Record<TenantJourneyStage, Partial<Record<string, string>>>> = {
      'post-viewing': {
        'airport-transfer': 'Perfect timing for your arrival or departure coordination.',
      },
      'moving-in': {
        'cleaning': 'Get your new home ready before or after your move.',
        'grocery-delivery': 'Stock up on essentials as you settle in.',
      },
      'settled': {
        'maintenance': 'Keep your property in top condition with priority response.',
      },
      'recurring': {
        'maintenance': 'Your usage pattern suggests a recurring maintenance need.',
        'cleaning': 'Schedule regular cleanings to match your lifestyle.',
      },
    };
    return stageReasons[journeyContext.stage]?.[rule.serviceType]
      ?? `Available and ready to book in your current country pack.`;
  }

  private buildFreeHighlight(usageByServiceType: Map<string, number>, currency: string): string | null {
    const entries = [...usageByServiceType.entries()].filter(([, remaining]) => remaining > 0);
    if (!entries.length) return null;

    const top = entries.sort((a, b) => b[1] - a[1])[0];
    if (!top) return null;
    const [topService, topRemaining] = top;
    const name = DISPLAY_NAMES[topService] ?? topService;
    return `${name} covered up to ${currency} ${(topRemaining / 100).toFixed(0)} — use it before it resets.`;
  }
}
