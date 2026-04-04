import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
  ) {}

  async createMoveIn(userId: string, dto: CreateMoveInDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const countryCode = user.countryCode ?? 'QA';
    const costEvaluation = await this.operatorPolicyService.evaluateServiceCoverage(
      countryCode,
      'move-in',
      dto.estimatedCostMinor ?? 0,
    );

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

    if (costEvaluation.payableMinor > 0) {
      await this.prisma.unifiedRequest.update({
        where: { id: unifiedRequest.id },
        data: {
          status: 'AWAITING_PAYMENT',
          paymentStatus: 'PENDING',
        },
      });

      await this.prisma.payment.create({
        data: {
          unifiedRequestId: unifiedRequest.id,
          userId,
          amountMinor: costEvaluation.payableMinor,
          currency: countryCode === 'QA' ? 'QAR' : 'USD',
          provider: 'internal-service-wallet',
          providerRef: `svc_${Date.now()}`,
          status: 'PENDING',
          metadata: {
            serviceType: 'move-in',
            freeCoverageMinor: costEvaluation.appliedFreeMinor,
            estimatedCostMinor: costEvaluation.estimatedCostMinor,
          },
        },
      });
    }

    return this.prisma.movingRequest.create({
      data: {
        unifiedRequestId: unifiedRequest.id,
        tenantProfileId: (await this.prisma.tenantProfile.findUniqueOrThrow({ where: { userId } })).id,
        moveDate: new Date(dto.moveDate),
        pickupAddress: dto.pickupAddress,
        dropoffAddress: dto.dropoffAddress,
        estimatedCostMinor: dto.estimatedCostMinor,
        freeCoverageMinor: costEvaluation.appliedFreeMinor,
      },
      include: { unifiedRequest: true },
    });
  }

  async createMaintenance(userId: string, dto: CreateMaintenanceDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const unifiedRequest = await this.unifiedRequestsService.create(userId, {
      requestType: 'maintenance',
      serviceType: 'maintenance',
      country: user.countryCode ?? 'QA',
      city: user.countryCode === 'QA' ? 'Doha' : (user.countryCode ?? 'Doha'),
      metadata: JSON.parse(JSON.stringify(dto)) as Record<string, unknown>,
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
    const unifiedRequest = await this.unifiedRequestsService.create(userId, {
      requestType: 'cleaning',
      serviceType: 'cleaning',
      country: user.countryCode ?? 'QA',
      city: user.countryCode === 'QA' ? 'Doha' : (user.countryCode ?? 'Doha'),
      metadata: JSON.parse(JSON.stringify(dto)) as Record<string, unknown>,
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
    const unifiedRequest = await this.unifiedRequestsService.create(userId, {
      requestType: 'airport-transfer',
      serviceType: 'airport-transfer',
      country: user.countryCode ?? 'QA',
      city: user.countryCode === 'QA' ? 'Doha' : (user.countryCode ?? 'Doha'),
      pickupLat: dto.pickupLat,
      pickupLng: dto.pickupLng,
      dropoffLat: dto.dropoffLat,
      dropoffLng: dto.dropoffLng,
      metadata: JSON.parse(JSON.stringify(dto)) as Record<string, unknown>,
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