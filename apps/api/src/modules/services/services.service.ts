import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FreeServiceEngineService } from '../free-service-engine/free-service-engine.service';
import { inferIntegrationDomain, mapServiceTypeToNormalizedRequestType } from '../integration-hub/integration-contracts';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { OperatorPolicyService } from '../operator-policy/operator-policy.service';
import { UnifiedRequestsService } from '../unified-requests/unified-requests.service';
import {
  CreateAirportTransferDto,
  CreateCleaningDto,
  CreateMaintenanceDto,
  CreateMoveInDto,
  CreatePaidServiceDto,
} from './dto/service-request.dto';

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unifiedRequestsService: UnifiedRequestsService,
    private readonly operatorPolicyService: OperatorPolicyService,
    private readonly freeServiceEngineService: FreeServiceEngineService,
    private readonly orchestratorService: OrchestratorService,
  ) {}

  private getCurrencyForCountry(countryCode: string): string {
    if (countryCode === 'QA') return 'QAR';
    if (countryCode === 'AE') return 'AED';
    if (countryCode === 'SA') return 'SAR';
    return 'USD';
  }

  private async evaluateServicePricing(params: {
    userId: string;
    countryCode: string;
    serviceType: string;
    requestedAmountMinor?: number;
  }) {
    let requestedAmountMinor = Math.max(0, params.requestedAmountMinor ?? 0);

    if (requestedAmountMinor === 0) {
      const rules = await this.operatorPolicyService.getCountryServiceRules(params.countryCode);
      const rule = rules.find((r) => r.serviceType === params.serviceType);
      requestedAmountMinor = Math.max(0, rule?.basePriceMinor ?? 0);
    }

    return this.freeServiceEngineService.evaluate({
      userId: params.userId,
      countryCode: params.countryCode,
      serviceType: params.serviceType,
      requestedAmountMinor,
    });
  }

  private async buildPolicyMetadata(countryCode: string, serviceType: string) {
    const runtimePolicy = await this.operatorPolicyService.getRuntimePolicyContext(countryCode);
    const serviceRule = runtimePolicy.serviceRules.find((rule) => rule.serviceType === serviceType);

    return {
      activeCountryCode: runtimePolicy.activeCountryCode,
      selectedCountryCode: runtimePolicy.selectedCountryCode,
      selectedCountryStatus: runtimePolicy.selectedCountryStatus,
      serviceRule,
      routingPolicy: runtimePolicy.routingPolicy,
      perkPolicy: runtimePolicy.perkPolicy,
      financialPolicy: runtimePolicy.financialPolicy,
      adapterPolicy: {
        integrationBoundary: 'core-dispatch',
        providerSelectionSource: 'orchestrator',
      },
      integrationContract: {
        providerDomain: inferIntegrationDomain(serviceType),
        normalizedRequestType: mapServiceTypeToNormalizedRequestType(serviceType),
      },
    };
  }

  private async applyFinancials(params: {
    userId: string;
    countryCode: string;
    unifiedRequestId: string;
    serviceType: string;
    evaluation: {
      requestedAmountMinor: number;
      coveredAmountMinor: number;
      tenantOwesMinor: number;
      category: 'free' | 'paid' | 'hybrid';
      freeCapMinor: number;
      freeLimitExceeded: boolean;
      serviceType: string;
      countryCode: string;
      isFullyFree: boolean;
      exceedanceMinor: number;
      explanation: string;
    };
  }) {
    await this.freeServiceEngineService.recordCostSplit({
      actorUserId: params.userId,
      unifiedRequestId: params.unifiedRequestId,
      evaluation: params.evaluation,
    });

    if (params.evaluation.tenantOwesMinor > 0) {
      await this.orchestratorService.moveRequestToAwaitingPayment({
        requestId: params.unifiedRequestId,
        actorUserId: params.userId,
        serviceType: params.serviceType,
        tenantOwesMinor: params.evaluation.tenantOwesMinor,
      });

      await this.prisma.payment.create({
        data: {
          unifiedRequestId: params.unifiedRequestId,
          userId: params.userId,
          amountMinor: params.evaluation.tenantOwesMinor,
          currency: this.getCurrencyForCountry(params.countryCode),
          provider: 'internal-service-wallet',
          providerRef: `svc_${Date.now()}`,
          status: 'PENDING',
          metadata: {
            serviceType: params.serviceType,
            freeCoverageMinor: params.evaluation.coveredAmountMinor,
            estimatedCostMinor: params.evaluation.requestedAmountMinor,
            category: params.evaluation.category,
          },
        },
      });
    }
  }

  async createMoveIn(userId: string, dto: CreateMoveInDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const countryCode = user.countryCode ?? 'QA';
    await this.operatorPolicyService.assertServiceEnabled(countryCode, 'move-in');
    const costEvaluation = await this.evaluateServicePricing({
      userId,
      countryCode,
      serviceType: 'move-in',
      requestedAmountMinor: dto.estimatedCostMinor,
    });
    const policyContext = await this.buildPolicyMetadata(countryCode, 'move-in');

    const unifiedRequest = await this.unifiedRequestsService.create(userId, {
      requestType: 'move-in',
      serviceType: 'move-in',
      country: countryCode,
      city: user.countryCode === 'QA' ? 'Doha' : (user.countryCode ?? 'Doha'),
      metadata: {
        ...(JSON.parse(JSON.stringify(dto)) as Record<string, unknown>),
        costEvaluation,
        policyContext,
      },
    });

    await this.applyFinancials({
      userId,
      countryCode,
      unifiedRequestId: unifiedRequest.id,
      serviceType: 'move-in',
      evaluation: costEvaluation,
    });

    return this.prisma.movingRequest.create({
      data: {
        unifiedRequestId: unifiedRequest.id,
        tenantProfileId: (await this.prisma.tenantProfile.findUniqueOrThrow({ where: { userId } })).id,
        moveDate: new Date(dto.moveDate),
        pickupAddress: dto.pickupAddress,
        dropoffAddress: dto.dropoffAddress,
        estimatedCostMinor: costEvaluation.requestedAmountMinor,
        freeCoverageMinor: costEvaluation.coveredAmountMinor,
      },
      include: { unifiedRequest: true },
    });
  }

  async createMaintenance(userId: string, dto: CreateMaintenanceDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const tenantProfile = await this.prisma.tenantProfile.findUniqueOrThrow({ where: { userId } });
    const requiresPropertyLink = dto.isPropertyScoped === true;
    if (requiresPropertyLink && !dto.propertyId?.trim()) {
      throw new BadRequestException('propertyId is required when isPropertyScoped=true');
    }

    const propertyId = dto.propertyId?.trim() || undefined;
    const linkedProperty = propertyId
      ? await this.prisma.property.findUnique({ where: { id: propertyId } })
      : null;
    if (propertyId && !linkedProperty) {
      throw new BadRequestException(`Invalid propertyId: ${propertyId}`);
    }

    const countryCode = linkedProperty?.countryCode ?? user.countryCode ?? 'QA';
    const city = linkedProperty?.city ?? (user.countryCode === 'QA' ? 'Doha' : (user.countryCode ?? 'Doha'));
    await this.operatorPolicyService.assertServiceEnabled(countryCode, 'maintenance');
    const costEvaluation = await this.evaluateServicePricing({
      userId,
      countryCode,
      serviceType: 'maintenance',
    });
    const policyContext = await this.buildPolicyMetadata(countryCode, 'maintenance');

    const unifiedRequest = await this.unifiedRequestsService.create(userId, {
      requestType: 'maintenance',
      serviceType: 'maintenance',
      country: countryCode,
      city,
      propertyIds: linkedProperty ? [linkedProperty.id] : [],
      locationLabel: linkedProperty ? `${linkedProperty.title} (${linkedProperty.city})` : undefined,
      targetLat: linkedProperty?.lat ?? undefined,
      targetLng: linkedProperty?.lng ?? undefined,
      metadata: {
        ...(JSON.parse(JSON.stringify(dto)) as Record<string, unknown>),
        costEvaluation,
        policyContext,
        propertyScope: {
          isPropertyScoped: linkedProperty !== null,
          propertyId: linkedProperty?.id ?? null,
          propertyCountryCode: linkedProperty?.countryCode ?? null,
          propertyCity: linkedProperty?.city ?? null,
        },
      },
    });

    await this.applyFinancials({
      userId,
      countryCode,
      unifiedRequestId: unifiedRequest.id,
      serviceType: 'maintenance',
      evaluation: costEvaluation,
    });

    return this.prisma.maintenanceRequest.create({
      data: {
        unifiedRequestId: unifiedRequest.id,
        tenantProfileId: tenantProfile.id,
        propertyId: linkedProperty?.id,
        category: dto.category,
        severity: dto.severity,
        preferredVisitAt: dto.preferredVisitAt ? new Date(dto.preferredVisitAt) : undefined,
      },
    });
  }

  async createCleaning(userId: string, dto: CreateCleaningDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const countryCode = user.countryCode ?? 'QA';
    await this.operatorPolicyService.assertServiceEnabled(countryCode, 'cleaning');
    const costEvaluation = await this.evaluateServicePricing({
      userId,
      countryCode,
      serviceType: 'cleaning',
    });
    const policyContext = await this.buildPolicyMetadata(countryCode, 'cleaning');

    const unifiedRequest = await this.unifiedRequestsService.create(userId, {
      requestType: 'cleaning',
      serviceType: 'cleaning',
      country: countryCode,
      city: user.countryCode === 'QA' ? 'Doha' : (user.countryCode ?? 'Doha'),
      metadata: {
        ...(JSON.parse(JSON.stringify(dto)) as Record<string, unknown>),
        costEvaluation,
        policyContext,
      },
    });

    await this.applyFinancials({
      userId,
      countryCode,
      unifiedRequestId: unifiedRequest.id,
      serviceType: 'cleaning',
      evaluation: costEvaluation,
    });

    return this.prisma.cleaningRequest.create({
      data: {
        unifiedRequestId: unifiedRequest.id,
        tenantProfileId: (await this.prisma.tenantProfile.findUniqueOrThrow({ where: { userId } })).id,
        serviceDate: new Date(dto.serviceDate),
        durationHours: dto.durationHours,
        isMonthlyIncluded: true,
      },
    });
  }

  async createAirportTransfer(userId: string, dto: CreateAirportTransferDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const countryCode = user.countryCode ?? 'QA';
    await this.operatorPolicyService.assertServiceEnabled(countryCode, 'airport-transfer');
    const costEvaluation = await this.evaluateServicePricing({
      userId,
      countryCode,
      serviceType: 'airport-transfer',
    });
    const policyContext = await this.buildPolicyMetadata(countryCode, 'airport-transfer');

    const unifiedRequest = await this.unifiedRequestsService.create(userId, {
      requestType: 'airport-transfer',
      serviceType: 'airport-transfer',
      country: countryCode,
      city: user.countryCode === 'QA' ? 'Doha' : (user.countryCode ?? 'Doha'),
      pickupLat: dto.pickupLat,
      pickupLng: dto.pickupLng,
      dropoffLat: dto.dropoffLat,
      dropoffLng: dto.dropoffLng,
      metadata: {
        ...(JSON.parse(JSON.stringify(dto)) as Record<string, unknown>),
        costEvaluation,
        policyContext,
      },
    });

    await this.applyFinancials({
      userId,
      countryCode,
      unifiedRequestId: unifiedRequest.id,
      serviceType: 'airport-transfer',
      evaluation: costEvaluation,
    });

    return this.prisma.airportTransferRequest.create({
      data: {
        unifiedRequestId: unifiedRequest.id,
        tenantProfileId: (await this.prisma.tenantProfile.findUniqueOrThrow({ where: { userId } })).id,
        pickupAt: new Date(dto.pickupAt),
        pickupLat: dto.pickupLat,
        pickupLng: dto.pickupLng,
        dropoffLat: dto.dropoffLat,
        dropoffLng: dto.dropoffLng,
        flightNumber: dto.flightNumber,
      },
    });
  }

  createPaidService(userId: string, dto: CreatePaidServiceDto) {
    return this.prisma.user.findUniqueOrThrow({ where: { id: userId } }).then(async (user) => {
      const countryCode = user.countryCode ?? 'QA';
      await this.operatorPolicyService.assertServiceEnabled(countryCode, dto.serviceType);
      const policyContext = await this.buildPolicyMetadata(countryCode, dto.serviceType);

      return this.unifiedRequestsService.create(userId, {
        requestType: dto.requestType,
        serviceType: dto.serviceType,
        country: countryCode,
        city: dto.city,
        metadata: {
          integrationMode: 'provider-adapter',
          requestedBy: 'tenant-app',
          policyContext,
        },
      });
    });
  }
}