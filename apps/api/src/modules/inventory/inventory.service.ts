import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [assets, orders, tickets, financialRecords] = await Promise.all([
      this.prisma.property.count(),
      this.prisma.booking.count(),
      this.prisma.unifiedRequest.count(),
      this.prisma.payment.count(),
    ]);

    return {
      assets,
      orders,
      tickets,
      financialRecords,
    };
  }

  listAssets(query: { status?: string; city?: string; countryCode?: string }) {
    return this.prisma.property.findMany({
      where: {
        status: query.status as never,
        city: query.city,
        countryCode: query.countryCode,
      },
      include: { media: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  listOrders(query: { status?: string }) {
    return this.prisma.booking.findMany({
      where: { status: query.status as never },
      include: { property: true, tenant: true, payments: true, invoice: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  listTickets(query: { status?: string; serviceType?: string; country?: string }) {
    return this.prisma.unifiedRequest.findMany({
      where: {
        status: query.status as never,
        serviceType: query.serviceType,
        country: query.country,
      },
      include: { trackingEvents: true },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  listFinancialRecords(query: { status?: string }) {
    return this.prisma.payment.findMany({
      where: { status: query.status as never },
      include: { user: true, booking: true, invoice: true },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }
}
