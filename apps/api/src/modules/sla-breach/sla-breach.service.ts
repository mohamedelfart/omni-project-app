import { Injectable, Logger } from '@nestjs/common';
import type { Prisma, UnifiedRequestStatus } from '@prisma/client';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { PrismaService } from '../prisma/prisma.service';

const TERMINAL_STATUSES: UnifiedRequestStatus[] = ['COMPLETED', 'CANCELLED', 'REJECTED', 'FAILED'];

export type SlaBreachEvaluateOutcome = 'skipped' | 'noop' | 'updated';

@Injectable()
export class SlaBreachService {
  private readonly logger = new Logger(SlaBreachService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditTrailService: AuditTrailService,
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

      const targetBreachType =
        responseBreached && completionBreached ? 'both' : responseBreached ? 'response' : 'completion';

      const mergedBreachType = this.mergeBreachType(r.breachType, targetBreachType);

      if (r.slaBreached && r.firstBreachedAt && mergedBreachType === r.breachType) {
        return 'noop' as const;
      }

      if (r.slaBreached && r.firstBreachedAt && mergedBreachType !== r.breachType) {
        await client.unifiedRequest.update({
          where: { id: requestId },
          data: { breachType: mergedBreachType },
        });
        await this.writeBreachAudit(r.country, requestId, {
          breachType: mergedBreachType,
          responseBreached,
          completionBreached,
          phase: 'upgrade',
        });
        return 'updated' as const;
      }

      const firstBreachedAt = r.firstBreachedAt ?? now;
      const escalationLevel = Math.max(r.escalationLevel ?? 0, 1);

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

      return 'updated' as const;
    };

    if (tx) {
      return run(tx);
    }

    return this.prisma.$transaction((inner) => run(inner));
  }

  /** Widen breach classification without dropping a prior axis (response vs completion). */
  private mergeBreachType(current: string | null, target: string): string {
    if (current === 'both' || target === 'both') {
      return 'both';
    }
    if (
      (current === 'response' && target === 'completion') ||
      (current === 'completion' && target === 'response')
    ) {
      return 'both';
    }
    return target;
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

  /**
   * Bounded scan of non-terminal requests that may have crossed an SLA boundary.
   * Intended for a low-frequency timer or manual / dashboard-triggered refresh.
   */
  async scanOpenRequests(limit = 50): Promise<{ examined: number; updated: number }> {
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
