import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { isProviderOperationalIntentCode } from '../orchestrator/provider-operational-intents';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { TenantPerksService } from '../notifications/tenant-perks.service';
import { OperatorPolicyService } from '../operator-policy/operator-policy.service';
import { PrismaService } from '../prisma/prisma.service';
import { UnifiedRequestsService } from '../unified-requests/unified-requests.service';
import type { AppendProviderOperationalIntentDto } from './dto/append-provider-operational-intent.dto';

@Injectable()
export class VendorExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestratorService: OrchestratorService,
    private readonly tenantPerksService: TenantPerksService,
    private readonly operatorPolicyService: OperatorPolicyService,
    private readonly unifiedRequestsService: UnifiedRequestsService,
  ) {}

  private async providerIdsForUser(userId: string): Promise<string[]> {
    const profiles = await this.prisma.providerProfile.findMany({
      where: { userId },
      select: { providerId: true },
    });

    return profiles.map((profile) => profile.providerId);
  }

  private scopeProviderIds(providerIds: string[], user: AuthenticatedUser): string[] {
    const providerContextId = typeof user.providerContextId === 'string' ? user.providerContextId : null;
    if (!providerContextId) {
      return providerIds;
    }
    if (!providerIds.includes(providerContextId)) {
      throw new ForbiddenException('Provider session context is invalid for current user');
    }
    return [providerContextId];
  }

  async listMyTickets(user: AuthenticatedUser) {
    const providerIds = await this.providerIdsForUser(user.id);
    if (!providerIds.length) {
      return [];
    }

    const scopedProviderIds = this.scopeProviderIds(providerIds, user);

    const requests = await this.prisma.unifiedRequest.findMany({
      where: { vendorId: { in: scopedProviderIds } },
      include: {
        user: { select: { fullName: true, phoneNumber: true, email: true } },
        viewingRequest: {
          include: {
            items: {
              include: {
                property: { select: { id: true, title: true, city: true, district: true } },
              },
            },
            assignment: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return requests.map((request) => ({
      ticketId: request.id,
      ticketCode: request.metadata && typeof request.metadata === 'object' ? (request.metadata as Record<string, unknown>).ticketCode ?? null : null,
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
      properties: request.viewingRequest?.items.map((item) => ({
        id: item.property.id,
        title: item.property.title,
        city: item.property.city,
        district: item.property.district,
        stopOrder: item.stopOrder,
      })) ?? [],
      serviceType: request.serviceType,
      status: request.status,
      country: request.country,
      city: request.city,
      preferredTime: request.preferredTime,
      createdAt: request.createdAt,
      etaMinutes: request.viewingRequest?.assignment?.etaMinutes ?? null,
    }));
  }

  async appendOperationalIntent(user: AuthenticatedUser, ticketId: string, dto: AppendProviderOperationalIntentDto) {
    const providerIds = await this.providerIdsForUser(user.id);
    if (!providerIds.length) {
      throw new ForbiddenException('No provider profile attached to current user');
    }

    const scopedProviderIds = this.scopeProviderIds(providerIds, user);

    const ticket = await this.prisma.unifiedRequest.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (!ticket.vendorId || !scopedProviderIds.includes(ticket.vendorId)) {
      throw new ForbiddenException('Ticket is not assigned to your provider account');
    }

    if (!isProviderOperationalIntentCode(dto.intent)) {
      throw new BadRequestException('Invalid operational intent');
    }

    const out = await this.orchestratorService.appendProviderOperationalIntent({
      requestId: ticket.id,
      actorUserId: user.id,
      expectedVendorId: ticket.vendorId,
      intent: dto.intent,
      note: dto.note,
      source: 'vendor_execution',
    });
    await this.unifiedRequestsService.emitProviderOperationalSignalSockets(ticket.id);
    return out;
  }

  async updateTicketStatus(user: AuthenticatedUser, ticketId: string, status: string, note?: string) {
    const providerIds = await this.providerIdsForUser(user.id);
    if (!providerIds.length) {
      throw new ForbiddenException('No provider profile attached to current user');
    }

    const scopedProviderIds = this.scopeProviderIds(providerIds, user);

    const ticket = await this.prisma.unifiedRequest.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (!ticket.vendorId || !scopedProviderIds.includes(ticket.vendorId)) {
      throw new ForbiddenException('Ticket is not assigned to your provider account');
    }

    const updated = await this.orchestratorService.updateRequestStatusFromVendor(
      ticket.id,
      user.id,
      ticket.vendorId,
      status,
      note,
    );

    await this.unifiedRequestsService.emitProviderRealtimeSocketsAfterMutation(updated);

    if (updated.status === 'COMPLETED') {
      const perkPolicy = this.operatorPolicyService.getPerkPolicy(ticket.country);

      if (perkPolicy.moveInCompletionEnabled && perkPolicy.moveInCompletionServiceTypes.includes(ticket.serviceType)) {
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

      if (perkPolicy.firstServiceEnabled && completedServicesBefore === 0) {
        await this.tenantPerksService.triggerPerk({
          userId: ticket.userId,
          trigger: 'FIRST_SERVICE',
          contextEntityId: ticket.id,
        });
      }

      if (perkPolicy.milestoneEnabled) {
        await this.tenantPerksService.checkAndTriggerMilestones(ticket.userId);
      }
    }

    return updated;
  }
}
