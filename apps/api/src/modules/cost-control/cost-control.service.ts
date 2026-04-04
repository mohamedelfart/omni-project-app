import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CostFilters = {
  countryCode?: string;
  startDate?: string;
  endDate?: string;
  assetId?: string;
  serviceType?: string;
};

@Injectable()
export class CostControlService {
  constructor(private readonly prisma: PrismaService) {}

  private buildDateRange(filters?: CostFilters) {
    if (!filters?.startDate && !filters?.endDate) {
      const now = new Date();
      return {
        gte: new Date(now.getFullYear(), now.getMonth(), 1),
        lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      };
    }

    return {
      gte: filters.startDate ? new Date(filters.startDate) : undefined,
      lte: filters.endDate ? new Date(filters.endDate) : undefined,
    };
  }

  private extractFinancials(metadata: unknown) {
    if (!metadata || typeof metadata !== 'object') {
      return {
        coveredAmountMinor: 0,
        tenantOwesMinor: 0,
        freeCapMinor: 0,
        freeLimitExceeded: false,
      };
    }

    const freeServiceEvaluation = (metadata as Record<string, unknown>).freeServiceEvaluation;
    if (!freeServiceEvaluation || typeof freeServiceEvaluation !== 'object') {
      return {
        coveredAmountMinor: 0,
        tenantOwesMinor: 0,
        freeCapMinor: 0,
        freeLimitExceeded: false,
      };
    }

    const raw = freeServiceEvaluation as Record<string, unknown>;
    return {
      coveredAmountMinor: Number(raw.coveredAmountMinor ?? 0),
      tenantOwesMinor: Number(raw.tenantOwesMinor ?? 0),
      freeCapMinor: Number(raw.freeCapMinor ?? 0),
      freeLimitExceeded: Boolean(raw.freeLimitExceeded ?? false),
    };
  }

  async getSummary(filters?: CostFilters) {
    const requests = await this.prisma.unifiedRequest.findMany({
      where: {
        country: filters?.countryCode,
        serviceType: filters?.serviceType,
        propertyIds: filters?.assetId ? { has: filters.assetId } : undefined,
        createdAt: this.buildDateRange(filters),
      },
      orderBy: { createdAt: 'desc' },
    });

    const properties = await this.prisma.property.findMany({
      where: {
        countryCode: filters?.countryCode,
        id: filters?.assetId,
      },
    });

    const bookings = await this.prisma.booking.findMany({
      where: {
        createdAt: this.buildDateRange(filters),
        propertyId: filters?.assetId,
        property: filters?.countryCode ? { countryCode: filters.countryCode } : undefined,
      },
      include: { property: true },
    });

    const costPerTenant = requests.reduce<Record<string, number>>((acc, request) => {
      acc[request.userId] = (acc[request.userId] ?? 0) + this.extractFinancials(request.metadata).coveredAmountMinor;
      return acc;
    }, {});

    const costPerAsset = requests.reduce<Record<string, number>>((acc, request) => {
      for (const propertyId of request.propertyIds) {
        acc[propertyId] = (acc[propertyId] ?? 0) + this.extractFinancials(request.metadata).coveredAmountMinor;
      }
      return acc;
    }, {});

    const costPerServiceType = requests.reduce<Record<string, number>>((acc, request) => {
      acc[request.serviceType] = (acc[request.serviceType] ?? 0) + this.extractFinancials(request.metadata).coveredAmountMinor;
      return acc;
    }, {});

    const totalMonthlyServiceCostMinor = Object.values(costPerServiceType).reduce((sum, value) => sum + value, 0);
    const totalRevenueMinor = bookings.reduce((sum, booking) => sum + booking.totalAmountMinor, 0);
    const totalPlatformMarginMinor = bookings.reduce((sum, booking) => sum + (booking.property.serviceFeeMinor * booking.termMonths), 0);

    const perTenantLimitBreaches = requests
      .filter((request) => this.extractFinancials(request.metadata).freeLimitExceeded)
      .map((request) => ({
        requestId: request.id,
        userId: request.userId,
        serviceType: request.serviceType,
        countryCode: request.country,
        ...this.extractFinancials(request.metadata),
      }));

    const perContractLimitBreaches = properties
      .map((property) => {
        const assetCostMinor = costPerAsset[property.id] ?? 0;
        const assetMarginMinor = bookings
          .filter((booking) => booking.propertyId === property.id)
          .reduce((sum, booking) => sum + (property.serviceFeeMinor * booking.termMonths), 0);

        return {
          assetId: property.id,
          title: property.title,
          serviceCostMinor: assetCostMinor,
          platformMarginMinor: assetMarginMinor,
          exceeded: assetCostMinor > assetMarginMinor && assetMarginMinor > 0,
        };
      })
      .filter((item) => item.exceeded);

    return {
      filters: filters ?? {},
      totals: {
        totalMonthlyServiceCostMinor,
        totalRevenueMinor,
        totalPlatformMarginMinor,
        costVsRevenueRatio: totalRevenueMinor ? Number((totalMonthlyServiceCostMinor / totalRevenueMinor).toFixed(4)) : 0,
        costVsMarginRatio: totalPlatformMarginMinor ? Number((totalMonthlyServiceCostMinor / totalPlatformMarginMinor).toFixed(4)) : 0,
      },
      costPerTenant,
      costPerAsset,
      costPerServiceType,
      perTenantLimitBreaches,
      perContractLimitBreaches,
      serviceCaps: requests.map((request) => ({
        requestId: request.id,
        serviceType: request.serviceType,
        userId: request.userId,
        ...this.extractFinancials(request.metadata),
      })),
    };
  }
}