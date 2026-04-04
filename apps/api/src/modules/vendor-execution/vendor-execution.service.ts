import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { TenantPerksService } from '../notifications/tenant-perks.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VendorExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestratorService: OrchestratorService,
    private readonly tenantPerksService: TenantPerksService,
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

    const updated = await this.orchestratorService.updateRequestStatusFromVendor(ticket.id, userId, status, note);

    if (updated.status === 'COMPLETED') {
      if (ticket.serviceType === 'move-in') {
        await this.tenantPerksService.triggerPerk({
          userId: ticket.userId,
          trigger: 'MOVE_IN_COMPLETE',
          contextEntityId: ticket.id,
        });
      }

      const completedServicesBefore = await this.prisma.unifiedRequest.count({
        where: {
          userId: ticket.userId,
          status: 'COMPLETED' as never,
          id: { not: ticket.id },
        },
      });

      if (completedServicesBefore === 0) {
        await this.tenantPerksService.triggerPerk({
          userId: ticket.userId,
          trigger: 'FIRST_SERVICE',
          contextEntityId: ticket.id,
        });
      }

      await this.tenantPerksService.checkAndTriggerMilestones(ticket.userId);
    }

    return updated;
  }
}
