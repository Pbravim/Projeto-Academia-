-- Sub-project 5b parity: non-strength logging fields (tracking_type, time/distance/intensity)
-- Mirror the mobile SQLite schema so the sync wire round-trips cardio/hold/reps_only data.

-- treino_exercicios: non-strength recommendation columns
ALTER TABLE "treino_exercicios" ADD COLUMN IF NOT EXISTS "duracao_recomendada_segundos" INTEGER;
ALTER TABLE "treino_exercicios" ADD COLUMN IF NOT EXISTS "distancia_recomendada_metros" DOUBLE PRECISION;
ALTER TABLE "treino_exercicios" ADD COLUMN IF NOT EXISTS "intensidade_recomendada" DOUBLE PRECISION;

-- sessao_exercicios: tracking_type snapshot + non-strength recommendation columns
ALTER TABLE "sessao_exercicios" ADD COLUMN IF NOT EXISTS "tracking_type_snapshot" TEXT;
ALTER TABLE "sessao_exercicios" ADD COLUMN IF NOT EXISTS "duracao_recomendada_segundos" INTEGER;
ALTER TABLE "sessao_exercicios" ADD COLUMN IF NOT EXISTS "distancia_recomendada_metros" DOUBLE PRECISION;
ALTER TABLE "sessao_exercicios" ADD COLUMN IF NOT EXISTS "intensidade_recomendada" DOUBLE PRECISION;

-- series_registradas: relax carga/reps to nullable (cardio/hold/reps_only) + add metric columns
ALTER TABLE "series_registradas" ALTER COLUMN "carga_kg" DROP NOT NULL;
ALTER TABLE "series_registradas" ALTER COLUMN "repeticoes" DROP NOT NULL;
ALTER TABLE "series_registradas" ADD COLUMN IF NOT EXISTS "duracao_segundos" INTEGER;
ALTER TABLE "series_registradas" ADD COLUMN IF NOT EXISTS "distancia_metros" DOUBLE PRECISION;
ALTER TABLE "series_registradas" ADD COLUMN IF NOT EXISTS "intensidade" DOUBLE PRECISION;
