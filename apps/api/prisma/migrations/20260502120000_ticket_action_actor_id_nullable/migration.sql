-- Allow system-generated TicketActions (e.g. SLA breach) with no actor user id.
ALTER TABLE "TicketAction" ALTER COLUMN "actorId" DROP NOT NULL;
