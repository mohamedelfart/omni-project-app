import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { OperatorPolicyService } from '../operator-policy/operator-policy.service';

export interface FreeServiceEvaluation {
  serviceType: string;
  countryCode: string;
  requestedAmountMinor: number;
  category: 'free' | 'paid' | 'hybrid';
  isFullyFree: boolean;
  freeCapMinor: number;
  coveredAmountMinor: number;
  tenantOwesMinor: number;
  freeLimitExceeded: boolean;
  exceedanceMinor: number;
  explanation: string;
}

export interface FreeServiceUsageSummary {
  userId: string;
  countryCode: string;
  serviceType: string;
  totalUsageMinor: number;
  freeCapMinor: number;
  remainingFreeMinor: number;
  isCapExhausted: boolean;
}

@Injectable()
export class FreeServiceEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditTrailService: AuditTrailService,
    private readonly operatorPolicyService: OperatorPolicyService,
  ) {}

  /**
   * Evaluate if a requested service is free, paid, or hybrid for a given tenant.
   * Accounts for cumulative usage against the country-level free cap per service type.
   */
  async evaluate(params: {
    userId: string;
    serviceType: string;
    countryCode: string;
    requestedAmountMinor: number;
  }): Promise<FreeServiceEvaluation> {
    const rules = await this.operatorPolicyService.getCountryServiceRules(params.countryCode);
    const rule = rules.find((r) => r.serviceType === params.serviceType);

    // Default to fully paid if no rule exists
    if (!rule || !rule.enabled) {
      return {
        serviceType: params.serviceType,
        countryCode: params.countryCode,
        requestedAmountMinor: params.requestedAmountMinor,
        category: 'paid',
        isFullyFree: false,
        freeCapMinor: 0,
        coveredAmountMinor: 0,
        tenantOwesMinor: params.requestedAmountMinor,
        freeLimitExceeded: true,
        exceedanceMinor: params.requestedAmountMinor,
        explanation: 'Service not configured for this country — full charge applies.',
      };
    }

    if (rule.category === 'paid') {
      return {
        serviceType: params.serviceType,
        countryCode: params.countryCode,
        requestedAmountMinor: params.requestedAmountMinor,
        category: 'paid',
        isFullyFree: false,
        freeCapMinor: 0,
        coveredAmountMinor: 0,
        tenantOwesMinor: params.requestedAmountMinor,
        freeLimitExceeded: false,
        exceedanceMinor: 0,
        explanation: `${params.serviceType} is a paid service in ${params.countryCode}.`,
      };
    }

    if (rule.category === 'free') {
      return {
        serviceType: params.serviceType,
        countryCode: params.countryCode,
        requestedAmountMinor: params.requestedAmountMinor,
        category: 'free',
        isFullyFree: true,
        freeCapMinor: rule.freeCapMinor,
        coveredAmountMinor: params.requestedAmountMinor,
        tenantOwesMinor: 0,
        freeLimitExceeded: false,
        exceedanceMinor: 0,
        explanation: `${params.serviceType} is fully free in ${params.countryCode}.`,
      };
    }

    // Hybrid — check cumulative usage for this tenant
    const usage = await this.getUsageSummary({
      userId: params.userId,
      serviceType: params.serviceType,
      countryCode: params.countryCode,
    });

    const remainingFreeMinor = Math.max(0, usage.remainingFreeMinor);
    const coveredAmountMinor = Math.min(params.requestedAmountMinor, remainingFreeMinor);
    const tenantOwesMinor = params.requestedAmountMinor - coveredAmountMinor;
    const freeLimitExceeded = tenantOwesMinor > 0;

    return {
      serviceType: params.serviceType,
      countryCode: params.countryCode,
      requestedAmountMinor: params.requestedAmountMinor,
      category: 'hybrid',
      isFullyFree: !freeLimitExceeded,
      freeCapMinor: rule.freeCapMinor,
      coveredAmountMinor,
      tenantOwesMinor,
      freeLimitExceeded,
      exceedanceMinor: tenantOwesMinor,
      explanation: freeLimitExceeded
        ? `Free allowance of ${rule.freeCapMinor / 100} is partially exhausted. Tenant covers ${tenantOwesMinor / 100}.`
        : `Fully covered by free allowance (${coveredAmountMinor / 100} used).`,
    };
  }

  /**
   * Get a tenant's cumulative free-service usage for a given service type and country.
   */
  async getUsageSummary(params: {
    userId: string;
    serviceType: string;
    countryCode: string;
  }): Promise<FreeServiceUsageSummary> {
    const rules = await this.operatorPolicyService.getCountryServiceRules(params.countryCode);
    const rule = rules.find((r) => r.serviceType === params.serviceType);
    const freeCapMinor = rule?.freeCapMinor ?? 0;

    // Sum all completed/active requests that were covered under free allowance
    const requests = await this.prisma.unifiedRequest.findMany({
      where: {
        userId: params.userId,
        serviceType: params.serviceType,
        country: params.countryCode,
        status: { in: ['COMPLETED', 'IN_PROGRESS', 'ASSIGNED'] as never[] },
      },
      select: { metadata: true },
    });

    const totalUsageMinor = requests.reduce((sum, request) => {
      const metadata = request.metadata && typeof request.metadata === 'object'
        ? (request.metadata as Record<string, unknown>)
        : {};
      const freeServiceEvaluation = metadata.freeServiceEvaluation && typeof metadata.freeServiceEvaluation === 'object'
        ? (metadata.freeServiceEvaluation as Record<string, unknown>)
        : {};
      const coveredAmountMinor = Number(freeServiceEvaluation.coveredAmountMinor ?? 0);
      return sum + (Number.isFinite(coveredAmountMinor) ? coveredAmountMinor : 0);
    }, 0);
    const remainingFreeMinor = Math.max(0, freeCapMinor - totalUsageMinor);

    return {
      userId: params.userId,
      countryCode: params.countryCode,
      serviceType: params.serviceType,
      totalUsageMinor,
      freeCapMinor,
      remainingFreeMinor,
      isCapExhausted: totalUsageMinor >= freeCapMinor,
    };
  }

  /**
   * Record the cost split after a service is fulfilled (for tracking and audit).
   */
  async recordCostSplit(params: {
    actorUserId: string;
    unifiedRequestId: string;
    evaluation: FreeServiceEvaluation;
  }): Promise<void> {
    const existingRequest = await this.prisma.unifiedRequest.findUnique({
      where: { id: params.unifiedRequestId },
      select: { metadata: true },
    });

    const existingMetadata =
      existingRequest?.metadata && typeof existingRequest.metadata === 'object'
        ? (existingRequest.metadata as Record<string, unknown>)
        : {};

    await this.prisma.unifiedRequest.update({
      where: { id: params.unifiedRequestId },
      data: {
        metadata: JSON.parse(JSON.stringify({
          ...existingMetadata,
          freeServiceEvaluation: {
            category: params.evaluation.category,
            coveredAmountMinor: params.evaluation.coveredAmountMinor,
            tenantOwesMinor: params.evaluation.tenantOwesMinor,
            freeCapMinor: params.evaluation.freeCapMinor,
            freeLimitExceeded: params.evaluation.freeLimitExceeded,
          },
        })),
      },
    });

    await this.auditTrailService.write({
      actorUserId: params.actorUserId,
      action: 'FREE_SERVICE_COST_SPLIT_RECORDED',
      entity: 'UnifiedRequest',
      entityId: params.unifiedRequestId,
      countryCode: params.evaluation.countryCode,
      metadata: {
        serviceType: params.evaluation.serviceType,
        requestedAmountMinor: params.evaluation.requestedAmountMinor,
        coveredAmountMinor: params.evaluation.coveredAmountMinor,
        tenantOwesMinor: params.evaluation.tenantOwesMinor,
        category: params.evaluation.category,
      },
    });
  }
}
