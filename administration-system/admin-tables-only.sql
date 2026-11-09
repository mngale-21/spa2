-- ============================================================================
-- Inaongeza majedwali ya administration-system PEKEE (platform_admins,
-- subscriptions, platform_payments, activity_logs, platform_admin_companies).
-- HAIGUSI companies/branches/users/rooms/services/n.k. za backend.
-- Salama kuendesha mara nyingi (IF NOT EXISTS kila mahali).
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN', 'SUB_ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "platform_admins" (
  "id"           TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "email"        TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role"         "PlatformRole" NOT NULL DEFAULT 'SUB_ADMIN',
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_admins_email_key" ON "platform_admins"("email");

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id"        TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "planName"  TEXT NOT NULL,
  "amount"    DECIMAL(12,2) NOT NULL,
  "currency"  TEXT NOT NULL DEFAULT 'TZS',
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate"   TIMESTAMP(3) NOT NULL,
  "status"    "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "subscriptions_companyId_idx" ON "subscriptions"("companyId");

CREATE TABLE IF NOT EXISTS "platform_payments" (
  "id"        TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "amount"    DECIMAL(12,2) NOT NULL,
  "currency"  TEXT NOT NULL DEFAULT 'TZS',
  "method"    TEXT NOT NULL DEFAULT 'MANUAL',
  "reference" TEXT,
  "paidAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "platform_payments_companyId_idx" ON "platform_payments"("companyId");

CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id"              TEXT NOT NULL,
  "platformAdminId" TEXT,
  "companyId"       TEXT,
  "action"          TEXT NOT NULL,
  "details"         TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "activity_logs_companyId_idx" ON "activity_logs"("companyId");

DO $$ BEGIN
  ALTER TABLE "activity_logs"
    ADD CONSTRAINT "activity_logs_platformAdminId_fkey"
    FOREIGN KEY ("platformAdminId") REFERENCES "platform_admins"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "platform_admin_companies" (
  "id"              TEXT NOT NULL,
  "platformAdminId" TEXT NOT NULL,
  "companyId"       TEXT NOT NULL,
  "assignedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_admin_companies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_admin_companies_platformAdminId_companyId_key"
  ON "platform_admin_companies"("platformAdminId", "companyId");

DO $$ BEGIN
  ALTER TABLE "platform_admin_companies"
    ADD CONSTRAINT "platform_admin_companies_platformAdminId_fkey"
    FOREIGN KEY ("platformAdminId") REFERENCES "platform_admins"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
