import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UnifiedRequestsService } from '../unified-requests/unified-requests.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';

@Injectable()
export class ViewingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unifiedRequestsService: UnifiedRequestsService,
    private readonly orchestratorService: OrchestratorService,
  ) {}

  async getOrCreateShortlist(userId: string) {
    const shortlist = await this.prisma.shortlist.findFirst({
      where: { userId, isActive: true },
      include: { items: { include: { property: { include: { media: true } } }, orderBy: { position: 'asc' } } },
    });

    if (shortlist) {
      return shortlist;
    }

    return this.prisma.shortlist.create({
      data: { userId },
      include: { items: { include: { property: { include: { media: true } } }, orderBy: { position: 'asc' } } },
    });
  }

  async addToShortlist(userId: string, propertyId: string) {
    const shortlist = await this.getOrCreateShortlist(userId);
    const existingItem = shortlist.items.find((item) => item.propertyId === propertyId);
    if (existingItem) {
      return existingItem;
    }

    if (shortlist.items.length >= 3) {
      throw new BadRequestException('Shortlist can contain at most 3 properties');
    }

    return this.prisma.shortlistItem.create({
      data: {
        shortlistId: shortlist.id,
        propertyId,
        position: shortlist.items.length + 1,
      },
      include: { property: true },
    });
  }

  async compare(userId: string) {
    const shortlist = await this.getOrCreateShortlist(userId);
    return shortlist.items.map((item) => ({
      propertyId: item.property.id,
      title: item.property.title,
      rent: item.property.monthlyRentMinor,
      bedrooms: item.property.bedrooms,
      bathrooms: item.property.bathrooms,
      areaSqm: item.property.areaSqm,
    }));
  }

  async createViewingRequest(userId: string, payload: { preferredDateISO: string; pickupLat: number; pickupLng: number; notes?: string }) {
    const shortlist = await this.getOrCreateShortlist(userId);
    if (!shortlist.items.length || shortlist.items.length > 3) {
      throw new BadRequestException('Viewing request requires 1 to 3 shortlisted properties');
    }

    const unifiedRequest = await this.unifiedRequestsService.create(userId, {
      requestType: 'property-viewing',
      serviceType: 'viewing-transport',
      country: 'QA',
      city: shortlist.items[0]?.property.city ?? 'Doha',
      propertyIds: shortlist.items.map((item) => item.propertyId),
      preferredTime: payload.preferredDateISO,
      pickupLat: payload.pickupLat,
      pickupLng: payload.pickupLng,
      metadata: { notes: payload.notes },
    });

    const viewingRequest = await this.prisma.viewingRequest.create({
      data: {
        unifiedRequestId: unifiedRequest.id,
        tenantId: userId,
        shortlistId: shortlist.id,
        preferredDate: new Date(payload.preferredDateISO),
        pickupLat: payload.pickupLat,
        pickupLng: payload.pickupLng,
        pickupAddress: 'Tenant live location',
        selectedPropertyIds: shortlist.items.map((item) => item.propertyId),
        notes: payload.notes,
        items: {
          create: shortlist.items.map((item) => ({ propertyId: item.propertyId, stopOrder: item.position })),
        },
      },
      include: { items: { include: { property: true } } },
    });

    const provider = await this.orchestratorService.selectProvider('viewing-transport', 'QA');
    if (provider) {
      await this.prisma.viewingTripAssignment.create({
        data: {
          viewingRequestId: viewingRequest.id,
          providerId: provider.id,
          status: 'ASSIGNED',
          etaMinutes: 12,
        },
      });
    }

    return this.prisma.viewingRequest.findUniqueOrThrow({
      where: { id: viewingRequest.id },
      include: { items: { include: { property: true } }, assignment: true, unifiedRequest: true },
    });
  }

  listViewingRequests() {
    return this.prisma.viewingRequest.findMany({
      include: { items: { include: { property: true } }, assignment: true, unifiedRequest: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}