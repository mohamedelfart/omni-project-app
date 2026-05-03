import type { Prisma } from '@prisma/client';
import type { TicketAction, TicketActionType, TicketId } from '@quickrent/shared-types';

/**
 * Row shape loaded from Prisma `TicketAction` (column names).
 * `metadata` is not stored yet — omit in mapper until a migration adds it.
 */
export type PersistedTicketActionRow = {
  id: string;
  ticketId: string;
  actionType: string;
  actorType: string;
  actorId: string;
  payload: Prisma.JsonValue | null;
  createdAt: Date;
};

function prismaPayloadToRecord(payload: Prisma.JsonValue | null): Record<string, unknown> {
  if (payload === null || payload === undefined) return {};
  if (typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return { value: payload as unknown };
}

export function mapPersistedTicketActionToDomain(row: PersistedTicketActionRow): TicketAction {
  const action: TicketAction = {
    id: row.id,
    ticketId: row.ticketId as TicketId,
    type: row.actionType as TicketActionType,
    payload: prismaPayloadToRecord(row.payload),
    createdBy: { type: row.actorType, id: row.actorId },
    createdAt: row.createdAt,
  };
  return action;
}
