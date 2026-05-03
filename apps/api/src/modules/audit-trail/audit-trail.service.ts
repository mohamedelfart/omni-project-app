import { Injectable } from '@nestjs/common';
import { Prisma, AuditSeverity } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditWriteInput {
  actorUserId?: string;
  action: string;
  entity: string;
  entityId: string;
  severity?: AuditSeverity;
  countryCode?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditTrailService {
  constructor(private readonly prisma: PrismaService) {}

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
  }

  write(input: AuditWriteInput) {
    return this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        severity: input.severity ?? 'INFO',
        countryCode: input.countryCode,
        metadata: this.toJson(input.metadata),
      },
    });
  }

  search(query: {
    action?: string;
    entity?: string;
    countryCode?: string;
    severity?: AuditSeverity;
    actorUserId?: string;
    take?: number;
  }) {
    return this.prisma.auditLog.findMany({
      where: {
        action: query.action,
        entity: query.entity,
        countryCode: query.countryCode,
        severity: query.severity,
        actorUserId: query.actorUserId,
      },
      orderBy: { createdAt: 'desc' },
      take: query.take ?? 100,
    });
  }
}
