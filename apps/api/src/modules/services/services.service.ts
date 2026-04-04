import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FreeServiceEngineService } from '../free-service-engine/free-service-engine.service';
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
      await this.prisma.unifiedRequest.update({
        where: { id: params.unifiedRequestId },
        data: {
          status: 'AWAITING_PAYMENT',
          paymentStatus: 'PENDING',
        },
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
    const costEvaluation = await this.evaluateServicePricing({
      userId,
      countryCode,
      serviceType: 'move-in',
      requestedAmountMinor: dto.estimatedCostMinor,
    });

    const unifiedRequest = await this.unifiedRequestsService.create(userId, {
      requestType: 'move-in',
      serviceType: 'move-in',
      country: countryCode,
      city: user.countryCode === 'QA' ? 'Doha' : (user.countryCode ?? 'Doha'),
      metadata: {
        ...(JSON.parse(JSON.stringify(dto)) as Record<string, unknown>),
        costEvaluation,
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
    const countryCode = user.countryCode ?? 'QA';
    const costEvaluation = await this.evaluateServicePricing({
      userId,
      countryCode,
      serviceType: 'maintenance',
    });

    const unifiedRequest = await this.unifiedRequestsService.create(userId, {
      requestType: 'maintenance',
      serviceType: 'maintenance',
      country: countryCode,
      city: user.countryCode === 'QA' ? 'Doha' : (user.countryCode ?? 'Doha'),
      metadata: {
        ...(JSON.parse(JSON.stringify(dto)) as Record<string, unknown>),
        costEvaluation,
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
        tenantProfileId: (await this.prisma.tenantProfile.findUniqueOrThrow({ where: { userId } })).id,
        category: dto.category,
        severity: dto.severity,
        preferredVisitAt: dto.preferredVisitAt ? new Date(dto.preferredVisitAt) : undefined,
      },
    });
  }

  async createCleaning(userId: string, dto: CreateCleaningDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const countryCode = user.countryCode ?? 'QA';
    const costEvaluation = await this.evaluateServicePricing({
      userId,
      countryCode,
      serviceType: 'cleaning',
    });

    const unifiedRequest = await this.unifiedRequestsService.create(userId, {
      requestType: 'cleaning',
      serviceType: 'cleaning',
      country: countryCode,
      city: user.countryCode === 'QA' ? 'Doha' : (user.countryCode ?? 'Doha'),
      metadata: {
        ...(JSON.parse(JSON.stringify(dto)) as Record<string, unknown>),
        costEvaluation,
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
    const costEvaluation = await this.evaluateServicePricing({
      userId,
      countryCode,
      serviceType: 'airport-transfer',
    });

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
    return this.prisma.user.findUniqueOrThrow({ where: { id: userId } }).then((user) =>
      this.unifiedRequestsService.create(userId, {
      requestType: dto.requestType,
      serviceType: dto.serviceType,
      country: user.countryCode ?? 'QA',
      city: dto.city,
      metadata: { integrationMode: 'provider-adapter', requestedBy: 'tenant-app' },
    }));
  }
}