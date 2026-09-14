-- Sessão livre (#33): SessaoTreino.treinoId vira opcional. Expand-only —
-- nenhuma coluna removida, so DROP NOT NULL + troca de ON DELETE RESTRICT
-- para SET NULL (apagar o treino nao pode mais falhar a delecao nem
-- arrastar as sessoes junto: elas viram "sessoes livres").
ALTER TABLE "sessao_treinos" ALTER COLUMN "treino_id" DROP NOT NULL;

ALTER TABLE "sessao_treinos" DROP CONSTRAINT "sessao_treinos_treino_id_fkey";

ALTER TABLE "sessao_treinos" ADD CONSTRAINT "sessao_treinos_treino_id_fkey" FOREIGN KEY ("treino_id") REFERENCES "treinos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
