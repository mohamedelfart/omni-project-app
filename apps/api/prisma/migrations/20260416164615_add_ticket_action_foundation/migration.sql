-- CreateTable
CREATE TABLE "TicketAction" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketAction_ticketId_createdAt_idx" ON "TicketAction"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "TicketAction_actionType_createdAt_idx" ON "TicketAction"("actionType", "createdAt");

-- AddForeignKey
ALTER TABLE "TicketAction" ADD CONSTRAINT "TicketAction_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "UnifiedRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
