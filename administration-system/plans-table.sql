-- ============================================================================
-- Jedwali la "plans" (vifurushi) - linaloweza kuhaririwa na Super Admin
-- kupitia Administration System (bei, kikomo cha matawi, wafanyakazi, n.k.)
-- Jedwali hili ni JIPYA kabisa (halihusiani na companies/branches/users),
-- kwa hiyo ni SALAMA kuliongeza - halitagusa data yoyote iliyopo.
--
-- Endesha kutoka administration-system:
--   npx prisma db execute --file=./plans-table.sql --schema=./prisma/schema.prisma
-- ============================================================================

CREATE TABLE IF NOT EXISTS "plans" (
  "id"                 TEXT NOT NULL,
  "key"                TEXT NOT NULL,
  "label"              TEXT NOT NULL,
  "maxBranches"        INTEGER NOT NULL DEFAULT 1,
  "maxStaff"           INTEGER NOT NULL DEFAULT 5,
  "whatsappEnabled"    BOOLEAN NOT NULL DEFAULT true,
  "prioritySupport"    BOOLEAN NOT NULL DEFAULT false,
  "advancedReports"    BOOLEAN NOT NULL DEFAULT false,
  "priceTzs"           DECIMAL(12,2) NOT NULL DEFAULT 0,
  "isActive"           BOOLEAN NOT NULL DEFAULT true,
  "sortOrder"          INTEGER NOT NULL DEFAULT 0,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "plans_key_key" ON "plans"("key");

-- Vifurushi 4 vya awali (unaweza kuvihariri/kuongeza zaidi kupitia
-- Administration System > Vifurushi, baada ya jedwali hili kuundwa).
INSERT INTO "plans" ("id", "key", "label", "maxBranches", "maxStaff", "whatsappEnabled", "prioritySupport", "advancedReports", "priceTzs", "sortOrder")
VALUES
  (gen_random_uuid()::text, 'BASIC',      'Kifurushi cha Kawaida',  3,  10, true,  false, false, 45000,  1),
  (gen_random_uuid()::text, 'STANDARD',   'Kifurushi cha Kati',     5,  25, true,  false, true,  85000,  2),
  (gen_random_uuid()::text, 'PREMIUM',    'Kifurushi cha Premium',  10, 60, true,  true,  true,  150000, 3),
  (gen_random_uuid()::text, 'ENTERPRISE', 'Kifurushi cha Enterprise', 999, 999, true, true, true, 300000, 4)
ON CONFLICT ("key") DO NOTHING;
