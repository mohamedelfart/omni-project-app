import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { TicketAction } from '@quickrent/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { mapPersistedTicketActionToDomain } from './ticket-actions.mapper';

type CreateTicketActionInput = {
  ticketId: string;
  actionType: string;
  actorType: string;
  actorId?: string | null;
  payload?: Prisma.InputJsonValue;
};

@Injectable()
export class TicketActionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listHistoryByTicketId(ticketId: string): Promise<TicketAction[]> {
    const rows = await this.prisma.ticketAction.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        ticketId: true,
        actionType: true,
        actorType: true,
        actorId: true,
        payload: true,
        createdAt: true,
      },
    });
    return rows.map(mapPersistedTicketActionToDomain);
  }

  async createAction(input: CreateTicketActionInput): Promise<TicketAction> {
    const created = await this.prisma.ticketAction.create({
      data: {
        ticketId: input.ticketId,
        actionType: input.actionType,
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        payload: input.payload,
      },
    });
    return mapPersistedTicketActionToDomain(created);
  }
}
