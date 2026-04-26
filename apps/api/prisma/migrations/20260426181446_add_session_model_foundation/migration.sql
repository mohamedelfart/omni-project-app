-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('USER', 'GUEST');

-- CreateEnum
CREATE TYPE "SessionActiveRole" AS ENUM ('TENANT', 'LANDLORD', 'ADMIN', 'PROVIDER', 'COMMAND_CENTER', 'GUEST');

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionType" "SessionType" NOT NULL,
    "activeRole" "SessionActiveRole",
    "refreshTokenHash" TEXT NOT NULL,
    "refreshTokenFamily" TEXT NOT NULL,
    "refreshTokenVersion" INTEGER NOT NULL DEFAULT 1,
    "providerContextId" TEXT,
    "tenantContextId" TEXT,
    "deviceId" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_refreshTokenFamily_idx" ON "Session"("refreshTokenFamily");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Session_revokedAt_idx" ON "Session"("revokedAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
