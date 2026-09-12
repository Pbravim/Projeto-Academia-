-- serie_segmentos guarda os degraus (drop set, rest-pause, piramide) de uma
-- serie-mae (series_registradas, degrau 1); mobile v24 ja tem a tabela
-- equivalente. Expand-only: nada removido/alterado. CHECK(ordem >= 2) vive so
-- no SQL (Prisma nao modela CHECK).
CREATE TABLE "serie_segmentos" (
  "id" TEXT NOT NULL,
  "serie_id" TEXT NOT NULL,
  "ordem" INTEGER NOT NULL,
  "carga_kg" DOUBLE PRECISION,
  "repeticoes" INTEGER,
  "descanso_segundos" INTEGER,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  "deleted_at" TEXT,
  "dirty" BOOLEAN NOT NULL DEFAULT true,
  "server_rev" TEXT,
  "server_updated_at" TIMESTAMPTZ,

  CONSTRAINT "serie_segmentos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "serie_segmentos_serie_id_fkey" FOREIGN KEY ("serie_id") REFERENCES "series_registradas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "serie_segmentos_ordem_check" CHECK ("ordem" >= 2)
);

CREATE INDEX "serie_segmentos_serie_id_idx" ON "serie_segmentos"("serie_id");
CREATE INDEX "serie_segmentos_server_updated_at_idx" ON "serie_segmentos"("server_updated_at");
