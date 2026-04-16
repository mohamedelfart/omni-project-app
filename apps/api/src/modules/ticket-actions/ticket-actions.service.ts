import { Injectable } from '@nestjs/common';
import { Prisma, TicketAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CreateTicketActionInput = {
  ticketId: string;
  actionType: string;
  actorType: string;
  actorId: string;
  payload?: Prisma.InputJsonValue;
};

export type TicketActionHistoryItem = {
  actionType: string;
  actorType: string;
  actorId: string;
  payload: Prisma.JsonValue | null;
  createdAt: Date;
};

@Injectable()
export class TicketActionsService {
  constructor(private readonly prisma: PrismaService) {}

  listHistoryByTicketId(ticketId: string): Promise<TicketActionHistoryItem[]> {
    return this.prisma.ticketAction.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      select: {
        actionType: true,
        actorType: true,
        actorId: true,
        payload: true,
        createdAt: true,
      },
    });
  }

  createAction(input: CreateTicketActionInput): Promise<TicketAction> {
    return this.prisma.ticketAction.create({
      data: {
        ticketId: input.ticketId,
        actionType: input.actionType,
        actorType: input.actorType,
        actorId: input.actorId,
        payload: input.payload,
      },
    });
  }
}
