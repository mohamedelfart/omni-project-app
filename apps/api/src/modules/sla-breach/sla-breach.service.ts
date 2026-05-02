import { Injectable, Logger } from '@nestjs/common';
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
        await this.writeBreachAudit(r.country, requestId, {
          breachType: mergedBreachType,
          responseBreached,
          completionBreached,
          phase: 'upgrade',
        });
        await this.writeEscalationActionIfMaterialTransition(client, {
          requestId,
          fromEscalationLevel: r.escalationLevel ?? 0,
          toEscalationLevel: nextEscalationLevel,
          fromBreachType: r.breachType,
          toBreachType: mergedBreachType,
          reason: 'sla_breach_type_widened',
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

      await this.writeBreachAudit(r.country, requestId, {
        breachType: mergedBreachType,
        responseBreached,
        completionBreached,
        phase: 'initial',
      });
      await this.writeEscalationActionIfMaterialTransition(client, {
        requestId,
        fromEscalationLevel: r.escalationLevel ?? 0,
        toEscalationLevel: escalationLevel,
        fromBreachType: r.breachType,
        toBreachType: mergedBreachType,
        reason: 'sla_breach_detected',
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
      return tgt;
    }
    return tgt;
  }

  private async writeBreachAudit(
    country: string,
    requestId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.auditTrailService.write({
      action: 'SLA_BREACH_DETECTED',
      entity: 'UnifiedRequest',
      entityId: requestId,
      countryCode: country,
      severity: 'WARNING',
      metadata,
    });
  }

  private async writeEscalationActionIfMaterialTransition(
    client: Prisma.TransactionClient | PrismaService,
    input: {
      requestId: string;
      fromEscalationLevel: number;
      toEscalationLevel: number;
      fromBreachType: string | null;
      toBreachType: string;
      reason: string;
    },
  ): Promise<void> {
    const hasEscalationLevelIncrease = input.toEscalationLevel > input.fromEscalationLevel;
    const fromN = this.normalizeBreachTypeKey(input.fromBreachType);
    const toN = this.normalizeBreachTypeKey(input.toBreachType);
    const hasBreachTypeWidened = fromN !== toN;
    if (!hasEscalationLevelIncrease && !hasBreachTypeWidened) {
      return;
    }

    const transitionKey = this.buildEscalationTransitionKey(input);
    const latestEscalate = await client.ticketAction.findFirst({
      where: { ticketId: input.requestId, actionType: 'ESCALATE' },
      orderBy: { createdAt: 'desc' },
      select: { payload: true },
    });
    if (this.payloadHasTransitionKey(latestEscalate?.payload, transitionKey)) {
      return;
    }

    await this.ticketActionsService.createAction({
      ticketId: input.requestId,
      actionType: 'ESCALATE',
      actorType: 'system',
      actorId: 'sla-engine',
      payload: {
        source: 'sla-breach',
        reason: input.reason,
        fromEscalationLevel: input.fromEscalationLevel,
        toEscalationLevel: input.toEscalationLevel,
        fromBreachType: input.fromBreachType,
        toBreachType: input.toBreachType,
        transitionKey,
      },
    });
  }

  private buildEscalationTransitionKey(input: {
    requestId: string;
    fromEscalationLevel: number;
    toEscalationLevel: number;
    fromBreachType: string | null;
    toBreachType: string;
    reason: string;
  }): string {
    return [
      input.requestId,
      input.reason,
      `lvl:${input.fromEscalationLevel}->${input.toEscalationLevel}`,
      `breach:${input.fromBreachType ?? 'none'}->${input.toBreachType}`,
    ].join('|');
  }

  private payloadHasTransitionKey(payload: Prisma.JsonValue | null | undefined, key: string): boolean {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return false;
    }
    const transitionKey = (payload as Record<string, unknown>).transitionKey;
    return typeof transitionKey === 'string' && transitionKey === key;
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
