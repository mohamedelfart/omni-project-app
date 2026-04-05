import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { PrismaService } from '../prisma/prisma.service';
import { UnifiedRequestsService } from '../unified-requests/unified-requests.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';

@Injectable()
export class ViewingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unifiedRequestsService: UnifiedRequestsService,
    private readonly orchestratorService: OrchestratorService,
    private readonly auditTrailService: AuditTrailService,
  ) {}

  private isPrivileged(user: AuthenticatedUser) {
    return user.roles.includes('admin') || user.roles.includes('command-center');
  }

  private buildTicketCode(viewingRequestId: string, createdAt: Date) {
    const datePart = createdAt.toISOString().slice(0, 10).replace(/-/g, '');
    const indexPart = viewingRequestId.slice(-6).toUpperCase();
    return `VWT-${datePart}-${indexPart}`;
  }

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

  async removeFromShortlist(userId: string, propertyId: string) {
    const shortlist = await this.getOrCreateShortlist(userId);
    const item = shortlist.items.find((entry) => entry.propertyId === propertyId);
    if (!item) {
      return this.getOrCreateShortlist(userId);
    }

    await this.prisma.shortlistItem.delete({ where: { id: item.id } });

    const remaining = await this.prisma.shortlistItem.findMany({
      where: { shortlistId: shortlist.id },
      orderBy: { position: 'asc' },
    });

    await Promise.all(remaining.map((entry, index) =>
      this.prisma.shortlistItem.update({
        where: { id: entry.id },
        data: { position: index + 1 },
      }),
    ));

    return this.getOrCreateShortlist(userId);
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
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { tenantProfile: true },
    });
    const shortlist = await this.getOrCreateShortlist(userId);
    if (!shortlist.items.length || shortlist.items.length > 3) {
      throw new BadRequestException('Viewing request requires 1 to 3 shortlisted properties');
    }

    const primaryProperty = shortlist.items[0]?.property;
    const countryCode = primaryProperty?.countryCode ?? user.countryCode ?? 'QA';
    const city = primaryProperty?.city ?? user.tenantProfile?.preferredCity ?? 'Doha';
    const locationLabel = user.tenantProfile?.currentAddress ?? 'Tenant live location';
    const ticketPropertyDetails = shortlist.items.map((item) => ({
      propertyId: item.propertyId,
      title: item.property.title,
      city: item.property.city,
      district: item.property.district,
      stopOrder: item.position,
    }));

    const unifiedRequest = await this.unifiedRequestsService.create(userId, {
      requestType: 'property-viewing',
      serviceType: 'viewing-transport',
      country: countryCode,
      city,
      propertyIds: shortlist.items.map((item) => item.propertyId),
      preferredTime: payload.preferredDateISO,
      locationLabel,
      currentLat: user.tenantProfile?.currentLat ?? payload.pickupLat,
      currentLng: user.tenantProfile?.currentLng ?? payload.pickupLng,
      pickupLat: payload.pickupLat,
      pickupLng: payload.pickupLng,
      metadata: {
        notes: payload.notes,
        selectedPropertyIds: shortlist.items.map((item) => item.propertyId),
        flow: 'tenant-core-command-center-vendor',
        tenant: {
          userId: user.id,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
        },
        properties: ticketPropertyDetails,
      },
    });

    const latestUnifiedRequest = await this.prisma.unifiedRequest.findUniqueOrThrow({
      where: { id: unifiedRequest.id },
      include: { trackingEvents: true },
    });

    const viewingRequest = await this.prisma.viewingRequest.create({
      data: {
        unifiedRequestId: latestUnifiedRequest.id,
        tenantId: userId,
        shortlistId: shortlist.id,
        preferredDate: new Date(payload.preferredDateISO),
        pickupLat: payload.pickupLat,
        pickupLng: payload.pickupLng,
        pickupAddress: locationLabel,
        status: latestUnifiedRequest.vendorId ? 'ASSIGNED' : 'PENDING',
        selectedPropertyIds: shortlist.items.map((item) => item.propertyId),
        notes: payload.notes,
        items: {
          create: shortlist.items.map((item) => ({ propertyId: item.propertyId, stopOrder: item.position })),
        },
      },
      include: { items: { include: { property: true } } },
    });

    const ticketCode = this.buildTicketCode(viewingRequest.id, viewingRequest.createdAt);
    const unifiedMetadata = latestUnifiedRequest.metadata && typeof latestUnifiedRequest.metadata === 'object'
      ? latestUnifiedRequest.metadata as Record<string, unknown>
      : {};

    await this.prisma.unifiedRequest.update({
      where: { id: latestUnifiedRequest.id },
      data: {
        notes: payload.notes,
        metadata: {
          ...unifiedMetadata,
          ticketCode,
          locationLabel,
          preferredDateISO: payload.preferredDateISO,
        },
      },
    });

    const provider = latestUnifiedRequest.vendorId
      ? await this.prisma.provider.findUnique({ where: { id: latestUnifiedRequest.vendorId } })
      : null;

    if (provider) {
      await this.prisma.viewingTripAssignment.create({
        data: {
          viewingRequestId: viewingRequest.id,
          providerId: provider.id,
          status: 'ASSIGNED',
          etaMinutes: 12,
        },
      });

      await this.prisma.unifiedRequestTrackingEvent.create({
        data: {
          unifiedRequestId: latestUnifiedRequest.id,
          actorType: 'system',
          title: 'Nearest vendor assigned for viewing trip',
          description: `${provider.name} will transport tenant to shortlisted properties.`,
          status: 'ASSIGNED',
        },
      });
    }

    await this.auditTrailService.write({
      actorUserId: userId,
      action: 'VIEWING_REQUEST_CREATED',
      entity: 'ViewingRequest',
      entityId: viewingRequest.id,
      countryCode,
      metadata: {
        propertyIds: shortlist.items.map((item) => item.propertyId),
        providerId: provider?.id,
        preferredDateISO: payload.preferredDateISO,
        ticketCode,
      },
    });

    return this.prisma.viewingRequest.findUniqueOrThrow({
      where: { id: viewingRequest.id },
      include: {
        items: { include: { property: true } },
        assignment: { include: { provider: true } },
        unifiedRequest: { include: { trackingEvents: true } },
      },
    });
  }

  async confirmSelectedProperty(userId: string, viewingRequestId: string, propertyId: string) {
    const viewingRequest = await this.prisma.viewingRequest.findUniqueOrThrow({
      where: { id: viewingRequestId },
      include: { unifiedRequest: true, items: true },
    });

    if (viewingRequest.tenantId !== userId) {
      throw new BadRequestException('Viewing request does not belong to current tenant');
    }

    const isInTrip = viewingRequest.items.some((item) => item.propertyId === propertyId);
    if (!isInTrip) {
      throw new BadRequestException('Selected property is not part of this viewing trip');
    }

    const updatedViewingRequest = await this.prisma.viewingRequest.update({
      where: { id: viewingRequestId },
      data: {
        status: 'COMPLETED',
        selectedPropertyIds: [propertyId],
      },
      include: { items: { include: { property: true } }, assignment: true, unifiedRequest: true },
    });

    await this.orchestratorService.completeRequestFromTenant({
      requestId: viewingRequest.unifiedRequestId,
      actorUserId: userId,
      propertyIds: [propertyId],
      title: 'Property selected after viewing',
      description: `Tenant selected property ${propertyId} and is ready to continue to payment.`,
      metadata: {
        propertyId,
        nextStep: 'payment',
      },
    });

    await this.auditTrailService.write({
      actorUserId: userId,
      action: 'VIEWING_PROPERTY_CONFIRMED',
      entity: 'ViewingRequest',
      entityId: viewingRequestId,
      countryCode: viewingRequest.unifiedRequest.country,
      metadata: {
        propertyId,
        unifiedRequestId: viewingRequest.unifiedRequestId,
        nextStep: 'payment',
      },
    });

    return {
      ...updatedViewingRequest,
      nextStep: 'payment',
      confirmedPropertyId: propertyId,
    };
  }

  listViewingRequests(user: AuthenticatedUser) {
    return this.prisma.viewingRequest.findMany({
      where: this.isPrivileged(user) ? undefined : { tenantId: user.id },
      include: { items: { include: { property: true } }, assignment: true, unifiedRequest: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getViewingRequestById(user: AuthenticatedUser, viewingRequestId: string) {
    const viewingRequest = await this.prisma.viewingRequest.findUniqueOrThrow({
      where: { id: viewingRequestId },
      include: {
        items: { include: { property: true } },
        assignment: { include: { provider: true } },
        unifiedRequest: { include: { trackingEvents: true } },
      },
    });

    if (!this.isPrivileged(user) && viewingRequest.tenantId !== user.id) {
      throw new ForbiddenException('Viewing request does not belong to current tenant');
    }

    return viewingRequest;
  }
}