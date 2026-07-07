-- exercise_alternatives marcava dirty no mobile mas estava fora do pipeline de
-- sync: vínculos manuais de alternativa nunca chegavam ao servidor e um restore
-- os perdia em silêncio (P2 rodada 3, apêndice C).
CREATE TABLE "exercise_alternatives" (
  "user_id" TEXT NOT NULL,
  "exercicio_id" TEXT NOT NULL,
  "alternativa_id" TEXT NOT NULL,
  "updated_at" TEXT,
  "deleted_at" TEXT,
  "dirty" BOOLEAN NOT NULL DEFAULT false,
  "server_updated_at" TIMESTAMPTZ,

  CONSTRAINT "exercise_alternatives_pkey" PRIMARY KEY ("user_id", "exercicio_id", "alternativa_id"),
  CONSTRAINT "exercise_alternatives_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "exercise_alternatives_server_updated_at_idx" ON "exercise_alternatives"("server_updated_at");
