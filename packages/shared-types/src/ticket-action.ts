/**
 * Domain: a Ticket is the OmniRent request aggregate (`UnifiedRequest` in persistence).
 * `ticketId` always references that aggregate’s id. TicketActions are append-only audit entries.
 */

/** Stable id for the ticket aggregate (maps to `UnifiedRequest.id` / Prisma `TicketAction.ticketId`). */
export type TicketId = string;

/**
 * Action discriminator. Known values are listed for cross-service contracts;
 * additional string values are allowed for forward compatibility (no per-type code here).
 */
export type TicketActionType =
  | 'ASSIGN'
  | 'ESCALATE'
  | 'PRIORITY_CHANGE'
  | 'STATUS_UPDATE'
  | 'PROVIDER_OPERATIONAL_INTENT'
  | (string & {});

/** Who performed the action (user, system job, integration, etc.) — opaque to this model. */
export type TicketActionCreatedBy = {
  type: string;
  id: string;
};

/**
 * Immutable, append-only record of something that happened on a ticket.
 * Semantics live entirely in `type` + `payload`; consumers interpret them.
 */
export type TicketAction = {
  id: string;
  ticketId: TicketId;
  type: TicketActionType;
  /** Arbitrary JSON-serializable details for this action (assignment ids, old/new priority, etc.). */
  payload: Record<string, unknown>;
  createdBy: TicketActionCreatedBy;
  createdAt: Date | string;
  /** Optional cross-cutting context (correlation id, client version, IP, etc.). */
  metadata?: Record<string, unknown> | null;
};
