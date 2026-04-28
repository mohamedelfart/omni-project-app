-- AlterTable
ALTER TABLE "UnifiedRequest" ADD COLUMN     "breachType" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "completionDueAt" TIMESTAMP(3),
ADD COLUMN     "escalationLevel" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "firstBreachedAt" TIMESTAMP(3),
ADD COLUMN     "firstResponseAt" TIMESTAMP(3),
ADD COLUMN     "responseDueAt" TIMESTAMP(3),
ADD COLUMN     "slaBreached" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slaPolicyRuleId" TEXT;

-- CreateTable
CREATE TABLE "SlaPolicyRule" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "priority" "RequestPriority" NOT NULL,
    "responseSlaMinutes" INTEGER NOT NULL,
    "completionSlaMinutes" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlaPolicyRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SlaPolicyRule_countryCode_serviceType_priority_effectiveFro_idx" ON "SlaPolicyRule"("countryCode", "serviceType", "priority", "effectiveFrom");

-- CreateIndex
CREATE INDEX "UnifiedRequest_slaPolicyRuleId_idx" ON "UnifiedRequest"("slaPolicyRuleId");

-- AddForeignKey
ALTER TABLE "UnifiedRequest" ADD CONSTRAINT "UnifiedRequest_slaPolicyRuleId_fkey" FOREIGN KEY ("slaPolicyRuleId") REFERENCES "SlaPolicyRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
