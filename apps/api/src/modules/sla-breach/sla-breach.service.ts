import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma, UnifiedRequestStatus } from '@prisma/client';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { PrismaService } from '../prisma/prisma.service';
import { TicketActionsService } from '../ticket-actions/ticket-actions.service';

const TERMINAL_STATUSES: UnifiedRequestStatus[] = ['COMPLETED', 'CANCELLED', 'REJECTED', 'FAILED'];

/** Stored on `UnifiedRequest.breachType` (time-driven SLA loop). */
export type SlaBreachAxis = 'RESPONSE' | 'COMPLETION' | 'BOTH';

export type SlaBreachEvaluateOutcome = 'skipped' | 'noop' | 'updated';

@Injectable()
export class SlaBreachService {
  private readonly logger = new Logger(SlaBreachService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditTrailService: AuditTrailService,
    private readonly ticketActionsService: TicketActionsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Evaluates SLA breach rules for one request and persists operational flags.
   * Does not change `status`. Safe to call repeatedly (idempotent).
   */
  async evaluateAndPersistForRequestId(requestId: string, tx?: Prisma.TransactionClient): Promise<SlaBreachEvaluateOutcome> {
    const run = async (client: Prisma.TransactionClient | PrismaService) => {
      const r = await client.unifiedRequest.findUnique({
        where: { id: requestId },
        select: {
          id: true,
          country: true,
          status: true,
          responseDueAt: true,
          completionDueAt: true,
          firstResponseAt: true,
          completedAt: true,
          slaBreached: true,
          firstBreachedAt: true,
          breachType: true,
          escalationLevel: true,
        },
      });

      if (!r) {
        return 'skipped' as const;
      }

      if (TERMINAL_STATUSES.includes(r.status)) {
        return 'noop' as const;
      }

      const now = new Date();

      const didAutoL2 = await this.tryAutoEscalateBreachedLevelOneToTwo(client, r, now);
      if (didAutoL2) {
        return 'updated' as const;
      }

      const responseBreached =
        r.responseDueAt != null && now.getTime() > r.responseDueAt.getTime() && r.firstResponseAt == null;

      const completionBreached =
        r.completionDueAt != null && now.getTime() > r.completionDueAt.getTime() && r.completedAt == null;

      if (!responseBreached && !completionBreached) {
        return 'noop' as const;
      }

      const targetBreachType: SlaBreachAxis =
        responseBreached && completionBreached ? 'BOTH' : responseBreached ? 'RESPONSE' : 'COMPLETION';

      const mergedBreachType = this.mergeBreachType(r.breachType, targetBreachType);
      const mergedNorm = this.normalizeBreachTypeKey(mergedBreachType);
      const currentNorm = this.normalizeBreachTypeKey(r.breachType);

      if (r.slaBreached && r.firstBreachedAt && mergedNorm === currentNorm) {
        return 'noop' as const;
      }

      if (r.slaBreached && r.firstBreachedAt && mergedNorm !== currentNorm) {
        const nextEscalationLevel = this.computeEscalationLevel(
          r.escalationLevel ?? 0,
          responseBreached,
          completionBreached,
        );
        await client.unifiedRequest.update({
          where: { id: requestId },
          data: {
            breachType: mergedBreachType,
            escalationLevel: nextEscalationLevel,
          },
        });
        await this.writeSlaBreachAuditOnce(r.country, requestId, {
          breachType: mergedBreachType,
          responseBreached,
          completionBreached,
          phase: 'upgrade',
          previousEscalationLevel: r.escalationLevel ?? 0,
          newEscalationLevel: nextEscalationLevel,
          fromBreachKey: currentNorm,
          toBreachKey: mergedBreachType,
        });
        await this.writeEscalationTicketActionForSlaEscalation(client, {
          requestId,
          fromEscalationLevel: r.escalationLevel ?? 0,
          toEscalationLevel: nextEscalationLevel,
          breachType: mergedBreachType,
        });
        return 'updated' as const;
      }

      const firstBreachedAt = r.firstBreachedAt ?? now;
      const escalationLevel = this.computeEscalationLevel(
        r.escalationLevel ?? 0,
        responseBreached,
        completionBreached,
      );

      await client.unifiedRequest.update({
        where: { id: requestId },
        data: {
          slaBreached: true,
          firstBreachedAt,
          breachType: mergedBreachType,
          escalationLevel,
        },
      });

      await this.writeSlaBreachAuditOnce(r.country, requestId, {
        breachType: mergedBreachType,
        responseBreached,
        completionBreached,
        phase: 'initial',
        previousEscalationLevel: r.escalationLevel ?? 0,
        newEscalationLevel: escalationLevel,
        fromBreachKey: currentNorm,
        toBreachKey: mergedBreachType,
      });
      await this.writeEscalationTicketActionForSlaEscalation(client, {
        requestId,
        fromEscalationLevel: r.escalationLevel ?? 0,
        toEscalationLevel: escalationLevel,
        breachType: mergedBreachType,
      });

      return 'updated' as const;
    };

    if (tx) {
      return run(tx);
    }

    return this.prisma.$transaction((inner) => run(inner));
  }

  /** Minimum escalation level implied by which SLA clocks are overdue (response → 1, completion → 2). */
  private escalationFloorForBreachFlags(responseBreached: boolean, completionBreached: boolean): number {
    let floor = 0;
    if (responseBreached) floor = Math.max(floor, 1);
    if (completionBreached) floor = Math.max(floor, 2);
    return floor;
  }

  private computeEscalationLevel(
    current: number,
    responseBreached: boolean,
    completionBreached: boolean,
  ): number {
    return Math.max(current, this.escalationFloorForBreachFlags(responseBreached, completionBreached));
  }

  private normalizeBreachTypeKey(s: string | null | undefined): SlaBreachAxis | null {
    if (s == null) {
      return null;
    }
    const t = String(s).trim();
    if (!t) {
      return null;
    }
    const u = t.toUpperCase();
    if (u === 'BOTH' || u === 'RESPONSE' || u === 'COMPLETION') {
      return u as SlaBreachAxis;
    }
    const l = t.toLowerCase();
    if (l === 'both') return 'BOTH';
    if (l === 'response') return 'RESPONSE';
    if (l === 'completion') return 'COMPLETION';
    return null;
  }

  /** Widen breach classification without dropping a prior axis (response vs completion). */
  private mergeBreachType(current: string | null, target: string): SlaBreachAxis {
    const cur = this.normalizeBreachTypeKey(current);
    const tgt = this.normalizeBreachTypeKey(target);
    if (tgt == null) {
      return 'RESPONSE';
    }
    if (cur === 'BOTH' || tgt === 'BOTH') {
      return 'BOTH';
    }
    if (cur === 'RESPONSE' && tgt === 'COMPLETION') {
      return 'BOTH';
    }
    if (cur === 'COMPLETION' && tgt === 'RESPONSE') {
      return 'BOTH';
    }
    if (cur == null) {
      return tgt ?? 'RESPONSE';
    }
    return tgt ?? 'RESPONSE';
  }

  /** Default 5m; override with `ESCALATION_LEVEL_2_DELAY_MS` (minimum 30_000 ms). */
  private getEscalationLevel2DelayMs(): number {
    const raw = this.configService.get<string>('ESCALATION_LEVEL_2_DELAY_MS');
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 30_000) {
      return Math.floor(n);
    }
    return 5 * 60 * 1000;
  }

  /**
   * After dwell at breach + escalation 1, bump to level 2 (time-driven; does not touch status or SLA breach flags).
   */
  private async tryAutoEscalateBreachedLevelOneToTwo(
    client: Prisma.TransactionClient | PrismaService,
    r: {
      id: string;
      country: string;
      slaBreached: boolean;
      firstBreachedAt: Date | null;
      escalationLevel: number | null;
    },
    now: Date,
  ): Promise<boolean> {
    const esc = r.escalationLevel ?? 0;
    if (!r.slaBreached || esc !== 1 || !r.firstBreachedAt) {
      return false;
    }
    const delayMs = this.getEscalationLevel2DelayMs();
    if (now.getTime() - r.firstBreachedAt.getTime() <= delayMs) {
      return false;
    }
    const dedupeKey = `auto-l2|${r.id}|1->2`;
    const exists = await client.ticketAction.findFirst({
      where: {
        ticketId: r.id,
        actionType: 'ESCALATE',
        payload: { path: ['autoEscalationDedupeKey'], equals: dedupeKey },
      },
      select: { id: true },
    });
    if (exists) {
      return false;
    }
    await client.unifiedRequest.update({
      where: { id: r.id },
      data: { escalationLevel: 2 },
    });
    await this.ticketActionsService.createAction({
      ticketId: r.id,
      actionType: 'ESCALATE',
      actorType: 'system',
      actorId: 'system',
      payload: {
        reason: 'AUTO_LEVEL_2_ESCALATION',
        previousEscalationLevel: 1,
        newEscalationLevel: 2,
        autoEscalationDedupeKey: dedupeKey,
      },
    });
    await this.auditTrailService.write({
      action: 'ESCALATION_LEVEL_2_TRIGGERED',
      entity: 'UnifiedRequest',
      entityId: r.id,
      countryCode: r.country,
      severity: 'WARNING',
      metadata: {
        requestId: r.id,
        fromEscalationLevel: 1,
        toEscalationLevel: 2,
        firstBreachedAt: r.firstBreachedAt.toISOString(),
        dedupeKey,
      },
    });
    return true;
  }

  private async writeSlaBreachAuditOnce(
    country: string,
    requestId: string,
    ctx: {
      breachType: string;
      responseBreached: boolean;
      completionBreached: boolean;
      phase: 'initial' | 'upgrade';
      previousEscalationLevel: number;
      newEscalationLevel: number;
      fromBreachKey: SlaBreachAxis | null;
      toBreachKey: SlaBreachAxis;
    },
  ): Promise<void> {
    const detectedAt = new Date().toISOString();
    const fromKey = ctx.fromBreachKey ?? 'none';
    const slaBreachDedupeKey = [
      'SLA_BREACH_DETECTED',
      requestId,
      ctx.phase,
      `${String(fromKey)}->${String(ctx.toBreachKey)}`,
      `e${ctx.previousEscalationLevel}->${ctx.newEscalationLevel}`,
    ].join('|');

    if (await this.auditTrailService.hasSlaBreachDetectedWithDedupeKey(requestId, slaBreachDedupeKey)) {
      return;
    }

    await this.auditTrailService.write({
      action: 'SLA_BREACH_DETECTED',
      entity: 'UnifiedRequest',
      entityId: requestId,
      countryCode: country,
      severity: 'WARNING',
      metadata: {
        requestId,
        breachType: ctx.breachType,
        previousEscalationLevel: ctx.previousEscalationLevel,
        newEscalationLevel: ctx.newEscalationLevel,
        detectedAt,
        slaBreachDedupeKey,
        responseBreached: ctx.responseBreached,
        completionBreached: ctx.completionBreached,
        phase: ctx.phase,
      },
    });
  }

  /**
   * When SLA evaluation raises `escalationLevel`, append a single system ESCALATE TicketAction.
   * Duplicate prevention: stable `slaBreachTransitionKey` on the JSON payload (unique per breach-level jump).
   */
  private async writeEscalationTicketActionForSlaEscalation(
    client: Prisma.TransactionClient | PrismaService,
    input: {
      requestId: string;
      fromEscalationLevel: number;
      toEscalationLevel: number;
      breachType: string;
    },
  ): Promise<void> {
    if (input.toEscalationLevel <= input.fromEscalationLevel) {
      return;
    }

    const detectedAt = new Date().toISOString();
    const slaBreachTransitionKey = [
      'sla-breach-escalate',
      input.requestId,
      `${input.fromEscalationLevel}->${input.toEscalationLevel}`,
      input.breachType,
    ].join('|');

    const exists = await client.ticketAction.findFirst({
      where: {
        ticketId: input.requestId,
        actionType: 'ESCALATE',
        payload: {
          path: ['slaBreachTransitionKey'],
          equals: slaBreachTransitionKey,
        },
      },
      select: { id: true },
    });
    if (exists) {
      return;
    }

    await this.ticketActionsService.createAction({
      ticketId: input.requestId,
      actionType: 'ESCALATE',
      actorType: 'system',
      actorId: 'system',
      payload: {
        reason: 'SLA breach',
        breachType: input.breachType,
        previousEscalationLevel: input.fromEscalationLevel,
        newEscalationLevel: input.toEscalationLevel,
        detectedAt,
        slaBreachTransitionKey,
      },
    });
  }

  /**
   * Bounded scan of non-terminal requests that may have crossed an SLA boundary.
   * Intended for a low-frequency timer or manual / dashboard-triggered refresh.
   */
  async scanOpenRequests(limit = 500): Promise<{ examined: number; updated: number }> {
    const now = new Date();

    const candidates = await this.prisma.unifiedRequest.findMany({
      where: {
        status: { notIn: [...TERMINAL_STATUSES] },
        OR: [
          { AND: [{ responseDueAt: { lt: now } }, { firstResponseAt: null }] },
          { AND: [{ completionDueAt: { lt: now } }, { completedAt: null }] },
        ],
      },
      select: { id: true },
      take: limit,
      orderBy: { updatedAt: 'asc' },
    });

    let updated = 0;
    for (const row of candidates) {
      try {
        const outcome = await this.evaluateAndPersistForRequestId(row.id);
        if (outcome === 'updated') {
          updated += 1;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`SLA breach evaluate failed requestId=${row.id} ${message}`);
      }
    }

    return { examined: candidates.length, updated };
  }
}
