import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditTrailService } from '../audit-trail/audit-trail.service';

export type PerkTrigger =
  | 'BOOKING_CONFIRMED'
  | 'MOVE_IN_COMPLETE'
  | 'ANNIVERSARY'
  | 'MANUAL'
  | 'MILESTONE'
  | 'FIRST_SERVICE';

export interface PerkTemplate {
  id: string;
  trigger: PerkTrigger;
  title: string;
  body: string;
  rewardPointsGranted: number;
  isActive: boolean;
}

/** Pre-defined hotel-style delight templates */
const PERK_TEMPLATES: PerkTemplate[] = [
  {
    id: 'perk-pool-welcome',
    trigger: 'BOOKING_CONFIRMED',
    title: '🏊 Your swimming pool is reserved!',
    body: 'Congratulations on your new home! Your private pool access is active from move-in day. Enjoy!',
    rewardPointsGranted: 200,
    isActive: true,
  },
  {
    id: 'perk-move-in-gift',
    trigger: 'MOVE_IN_COMPLETE',
    title: '🎁 Welcome home — a gift is waiting!',
    body: 'We\'ve arranged a complimentary cleaning service for your first week. No action needed — it\'s on us.',
    rewardPointsGranted: 500,
    isActive: true,
  },
  {
    id: 'perk-first-service',
    trigger: 'FIRST_SERVICE',
    title: '⭐ Your first QuickRent service — 20% off!',
    body: 'As a valued resident, your first service request is discounted. Use code FIRST20 automatically.',
    rewardPointsGranted: 100,
    isActive: true,
  },
  {
    id: 'perk-anniversary',
    trigger: 'ANNIVERSARY',
    title: '🎉 One year with QuickRent!',
    body: 'You\'ve been with us for a year. Here\'s 1,000 bonus reward points as a thank-you from our team.',
    rewardPointsGranted: 1000,
    isActive: true,
  },
  {
    id: 'perk-milestone-10',
    trigger: 'MILESTONE',
    title: '🏆 10 services — Elite status unlocked!',
    body: 'You\'ve completed 10 service requests. Welcome to Elite tier — priority assignment and dedicated support are now yours.',
    rewardPointsGranted: 750,
    isActive: true,
  },
];

@Injectable()
export class TenantPerksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditTrailService: AuditTrailService,
  ) {}

  getTemplates(): PerkTemplate[] {
    return PERK_TEMPLATES.filter((t) => t.isActive);
  }

  /**
   * Trigger a perk for a specific tenant based on a lifecycle event.
   * Creates an in-app notification + grants reward points.
   */
  async triggerPerk(params: {
    userId: string;
    trigger: PerkTrigger;
    contextEntityId?: string;
    manualMessage?: { title: string; body: string; points: number };
  }): Promise<{ notified: boolean; pointsGranted: number; perkId: string }> {
    const template = params.manualMessage
      ? null
      : PERK_TEMPLATES.find((t) => t.trigger === params.trigger && t.isActive);

    const title = params.manualMessage?.title ?? template?.title ?? 'A surprise from QuickRent!';
    const body = params.manualMessage?.body ?? template?.body ?? 'You have a new perk waiting for you.';
    const points = params.manualMessage?.points ?? template?.rewardPointsGranted ?? 0;
    const perkId = template?.id ?? `manual-${Date.now()}`;

    // Send in-app notification
    await this.prisma.notification.create({
      data: {
        userId: params.userId,
        title,
        body,
        channel: 'IN_APP',
        metadata: JSON.parse(JSON.stringify({
          perkId,
          trigger: params.trigger,
          contextEntityId: params.contextEntityId,
          rewardPointsGranted: points,
        })),
      },
    });

    // Grant reward points if wallet exists
    if (points > 0) {
      const wallet = await this.prisma.rewardsWallet.findUnique({ where: { userId: params.userId } });
      if (wallet) {
        await this.prisma.rewardsWallet.update({
          where: { userId: params.userId },
          data: {
            availablePoints: { increment: points },
            transactions: {
              create: {
                type: 'EARN',
                points: points,
                reason: `Hotel perk: ${title}`,
                referenceId: params.contextEntityId,
                user: {
                  connect: {
                    id: params.userId,
                  },
                },
              },
            },
          },
        });
      }
    }

    await this.auditTrailService.write({
      actorUserId: params.userId,
      action: 'TENANT_PERK_TRIGGERED',
      entity: 'Notification',
      entityId: perkId,
      metadata: {
        trigger: params.trigger,
        title,
        pointsGranted: points,
        contextEntityId: params.contextEntityId,
      },
    });

    return { notified: true, pointsGranted: points, perkId };
  }

  /**
   * Check milestones for a tenant and auto-trigger any earned perks.
   */
  async checkAndTriggerMilestones(userId: string): Promise<void> {
    const completedCount = await this.prisma.unifiedRequest.count({
      where: { userId, status: 'COMPLETED' as never },
    });

    const alreadyTriggered = await this.prisma.notification.count({
      where: {
        userId,
        metadata: {
          path: ['perkId'],
          equals: 'perk-milestone-10',
        },
      },
    });

    if (completedCount >= 10 && alreadyTriggered === 0) {
      await this.triggerPerk({ userId, trigger: 'MILESTONE', contextEntityId: `services:${completedCount}` });
    }
  }

  /**
   * Schedule anniversary perks for all active tenants with 1-year old bookings.
   * Designed to be called by a cron job or scheduled task.
   */
  async processAnniversaryPerks(): Promise<{ processed: number }> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const firstBookings = await this.prisma.booking.findMany({
      where: {
        startDate: {
          gte: new Date(oneYearAgo.getTime() - 1000 * 60 * 60 * 24),
          lte: new Date(oneYearAgo.getTime() + 1000 * 60 * 60 * 24),
        },
        status: 'ACTIVE' as never,
      },
      select: { tenantId: true, id: true },
    });

    let processed = 0;
    for (const booking of firstBookings) {
      const alreadySent = await this.prisma.notification.count({
        where: {
          userId: booking.tenantId,
          metadata: {
            path: ['perkId'],
            equals: 'perk-anniversary',
          },
        },
      });

      if (alreadySent === 0) {
        await this.triggerPerk({
          userId: booking.tenantId,
          trigger: 'ANNIVERSARY',
          contextEntityId: booking.id,
        });
        processed++;
      }
    }

    return { processed };
  }

  /**
   * Admin: send a manual surprise perk to a specific tenant.
   */
  async sendManualPerk(params: {
    adminUserId: string;
    tenantUserId: string;
    title: string;
    body: string;
    points: number;
  }): Promise<{ notified: boolean; pointsGranted: number }> {
    const result = await this.triggerPerk({
      userId: params.tenantUserId,
      trigger: 'MANUAL',
      manualMessage: {
        title: params.title,
        body: params.body,
        points: params.points,
      },
    });

    await this.auditTrailService.write({
      actorUserId: params.adminUserId,
      action: 'ADMIN_MANUAL_PERK_SENT',
      entity: 'User',
      entityId: params.tenantUserId,
      severity: 'INFO' as never,
      metadata: {
        title: params.title,
        points: params.points,
        tenantUserId: params.tenantUserId,
      },
    });

    return result;
  }
}
