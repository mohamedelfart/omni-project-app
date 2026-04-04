import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditTrailService } from '../audit-trail/audit-trail.service';

@Injectable()
export class VendorExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditTrailService: AuditTrailService,
  ) {}

  private async providerIdsForUser(userId: string): Promise<string[]> {
    const profiles = await this.prisma.providerProfile.findMany({
      where: { userId },
      select: { providerId: true },
    });

    return profiles.map((profile) => profile.providerId);
  }

  async listMyTickets(userId: string) {
    const providerIds = await this.providerIdsForUser(userId);
    if (!providerIds.length) {
      return [];
    }

    const requests = await this.prisma.unifiedRequest.findMany({
      where: { vendorId: { in: providerIds } },
      include: {
        user: { select: { fullName: true, phoneNumber: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return requests.map((request) => ({
      ticketId: request.id,
      userName: request.user.fullName,
      phone: request.user.phoneNumber,
      location: {
        label: request.locationLabel,
        currentLat: request.currentLat,
        currentLng: request.currentLng,
        pickupLat: request.pickupLat,
        pickupLng: request.pickupLng,
        dropoffLat: request.dropoffLat,
        dropoffLng: request.dropoffLng,
      },
      assetId: request.propertyIds[0] ?? null,
      serviceType: request.serviceType,
      status: request.status,
      country: request.country,
      city: request.city,
      preferredTime: request.preferredTime,
    }));
  }

  async updateTicketStatus(userId: string, ticketId: string, status: string, note?: string) {
    const providerIds = await this.providerIdsForUser(userId);
    if (!providerIds.length) {
      throw new ForbiddenException('No provider profile attached to current user');
    }

    const ticket = await this.prisma.unifiedRequest.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (!ticket.vendorId || !providerIds.includes(ticket.vendorId)) {
      throw new ForbiddenException('Ticket is not assigned to your provider account');
    }

    const updated = await this.prisma.unifiedRequest.update({
      where: { id: ticket.id },
      data: { status: status.toUpperCase() as never },
    });

    await this.prisma.unifiedRequestTrackingEvent.create({
      data: {
        unifiedRequestId: ticket.id,
        actorUserId: userId,
        actorType: 'provider',
        title: 'Vendor status update',
        description: note,
        status: status.toUpperCase() as never,
      },
    });

    await this.auditTrailService.write({
      actorUserId: userId,
      action: 'VENDOR_TICKET_STATUS_UPDATED',
      entity: 'UnifiedRequest',
      entityId: ticket.id,
      countryCode: ticket.country,
      metadata: { status: status.toUpperCase(), note },
    });

    return updated;
  }
}
