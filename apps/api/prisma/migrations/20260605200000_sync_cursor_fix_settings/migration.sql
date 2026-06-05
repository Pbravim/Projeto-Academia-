-- Fix UserSetting PK: drop old PK on key alone, add composite PK (user_id, key)
ALTER TABLE "user_settings" DROP CONSTRAINT "user_settings_pkey";
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id", "key");

-- Add sync columns to user_settings
ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "updated_at" TEXT;
ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "deleted_at" TEXT;
ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "dirty" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "server_rev" TEXT;

-- Add server_updated_at cursor column to all synced tables
ALTER TABLE "exercises"          ADD COLUMN IF NOT EXISTS "server_updated_at" TIMESTAMPTZ;
ALTER TABLE "treinos"            ADD COLUMN IF NOT EXISTS "server_updated_at" TIMESTAMPTZ;
ALTER TABLE "treino_exercicios"  ADD COLUMN IF NOT EXISTS "updated_at" TEXT;
ALTER TABLE "treino_exercicios"  ADD COLUMN IF NOT EXISTS "deleted_at" TEXT;
ALTER TABLE "treino_exercicios"  ADD COLUMN IF NOT EXISTS "dirty" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "treino_exercicios"  ADD COLUMN IF NOT EXISTS "server_rev" TEXT;
ALTER TABLE "treino_exercicios"  ADD COLUMN IF NOT EXISTS "server_updated_at" TIMESTAMPTZ;
ALTER TABLE "sessao_treinos"     ADD COLUMN IF NOT EXISTS "server_updated_at" TIMESTAMPTZ;
ALTER TABLE "sessao_exercicios"  ADD COLUMN IF NOT EXISTS "server_updated_at" TIMESTAMPTZ;
ALTER TABLE "series_registradas" ADD COLUMN IF NOT EXISTS "server_updated_at" TIMESTAMPTZ;
ALTER TABLE "registros_peso"     ADD COLUMN IF NOT EXISTS "server_updated_at" TIMESTAMPTZ;
ALTER TABLE "user_settings"      ADD COLUMN IF NOT EXISTS "server_updated_at" TIMESTAMPTZ;

-- Index to make cursor queries fast
CREATE INDEX IF NOT EXISTS "exercises_server_updated_at_idx"          ON "exercises"          ("server_updated_at");
CREATE INDEX IF NOT EXISTS "treinos_server_updated_at_idx"            ON "treinos"            ("server_updated_at");
CREATE INDEX IF NOT EXISTS "treino_exercicios_server_updated_at_idx"  ON "treino_exercicios"  ("server_updated_at");
CREATE INDEX IF NOT EXISTS "sessao_treinos_server_updated_at_idx"     ON "sessao_treinos"     ("server_updated_at");
CREATE INDEX IF NOT EXISTS "sessao_exercicios_server_updated_at_idx"  ON "sessao_exercicios"  ("server_updated_at");
CREATE INDEX IF NOT EXISTS "series_registradas_server_updated_at_idx" ON "series_registradas" ("server_updated_at");
CREATE INDEX IF NOT EXISTS "registros_peso_server_updated_at_idx"     ON "registros_peso"     ("server_updated_at");
CREATE INDEX IF NOT EXISTS "user_settings_server_updated_at_idx"      ON "user_settings"      ("server_updated_at");
