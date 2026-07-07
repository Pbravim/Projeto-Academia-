-- movement_pattern_snapshot existia no mobile mas não no wire/servidor: um device
-- restaurado ficava com NULL e a sugestão de substituto degradava (P2 rodada 3).
ALTER TABLE "sessao_exercicios" ADD COLUMN "movement_pattern_snapshot" TEXT;
