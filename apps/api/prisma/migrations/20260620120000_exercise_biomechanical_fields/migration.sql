-- Sub-project 5 parity: biomechanical exercise fields (movement_pattern, stabilizers,
-- execution_type, name_variations, primary/secondary_equipment, catalog_version, tracking_type).
-- Mirror the mobile SQLite schema (v17/v20) so the sync wire round-trips custom-exercise
-- metadata instead of silently wiping it. Carried as raw column values (TEXT / INTEGER);
-- arrays (stabilizers, name_variations) stay JSON-encoded strings, same as musculo_alvo.

ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "movement_pattern" TEXT;
ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "stabilizers" TEXT;
ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "execution_type" TEXT;
ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "name_variations" TEXT;
ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "primary_equipment" TEXT;
ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "secondary_equipment" TEXT;
ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "catalog_version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "tracking_type" TEXT;
