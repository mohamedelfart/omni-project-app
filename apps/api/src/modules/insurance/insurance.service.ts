import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInsuranceClaimDto, SubscribeInsuranceDto } from './dto/insurance.dto';

@Injectable()
export class InsuranceService {
  constructor(private readonly prisma: PrismaService) {}

  listPlans() {
    return this.prisma.insurancePlan.findMany({ where: { isActive: true }, orderBy: { premiumMinor: 'asc' } });
  }

  async subscribe(userId: string, dto: SubscribeInsuranceDto) {
    const tenantProfile = await this.prisma.tenantProfile.findUniqueOrThrow({ where: { userId } });
    const plan = await this.prisma.insurancePlan.findUniqueOrThrow({ where: { id: dto.planId } });

    return this.prisma.insuranceSubscription.create({
      data: {
        tenantProfileId: tenantProfile.id,
        planId: dto.planId,
        status: 'ACTIVE',
        policyNumber: `QR-POL-${Date.now()}`,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        premiumMinor: plan.premiumMinor,
        currency: plan.currency,
      },
      include: { plan: true },
    });
  }

  createClaim(dto: CreateInsuranceClaimDto) {
    return this.prisma.insuranceClaim.create({
      data: {
        subscriptionId: dto.subscriptionId,
        claimNumber: `QR-CLM-${Date.now()}`,
        incidentDate: new Date(dto.incidentDate),
        amountClaimedMinor: dto.amountClaimedMinor,
        currency: 'QAR',
        description: dto.description,
      },
    });
  }
}