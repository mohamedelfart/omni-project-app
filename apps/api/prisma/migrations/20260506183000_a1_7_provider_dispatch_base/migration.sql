-- A1.7 Step 3A — Provider dispatch base (nullable operational anchor; routing unchanged until wired).

ALTER TABLE "Provider"
ADD COLUMN "dispatchBaseLat" DOUBLE PRECISION,
ADD COLUMN "dispatchBaseLng" DOUBLE PRECISION,
ADD COLUMN "dispatchBaseLabel" TEXT,
ADD COLUMN "dispatchBaseSource" TEXT,
ADD COLUMN "dispatchBaseUpdatedAt" TIMESTAMP(3),
ADD COLUMN "dispatchBaseSetByUserId" TEXT;
