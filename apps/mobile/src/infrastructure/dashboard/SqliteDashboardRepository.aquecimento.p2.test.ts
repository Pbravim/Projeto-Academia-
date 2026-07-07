import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { SqliteDashboardRepository } from './SqliteDashboardRepository';

/**
 * Regressão P2-6 (auditoria rodada 3): volume/1RM do dashboard incluíam séries
 * de aquecimento enquanto o histórico as exclui — números divergiam entre telas
 * e um aquecimento leve de muitas reps virava "recorde pessoal".
 */

const T = '2026-07-01T10:00:00.000Z';
const T_FIM = '2026-07-01T11:00:00.000Z';

let db: SQLiteDatabaseClient;
let repo: SqliteDashboardRepository;

beforeEach(async () => {
  db = createTestDatabase();
  repo = new SqliteDashboardRepository(db);
  await db.run(
    `INSERT INTO treinos (id, name, created_at, updated_at) VALUES ('tr-1', 'Treino A', ?, ?)`,
    [T, T],
  );
  await db.run(
    `INSERT INTO exercises (id, name, normalized_name, group_muscle, category, load_unit, is_custom, created_at, updated_at, dirty)
     VALUES ('ex-1', 'Supino', 'supino', 'Peito', 'Composto', 'kg', 1, ?, ?, 0)`,
    [T, T],
  );
  await db.run(
    `INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, data_hora_fim, status, updated_at, dirty)
     VALUES ('st-1', 'tr-1', 'Treino A', ?, ?, 'finalizada', ?, 0)`,
    [T, T_FIM, T],
  );
  await db.run(
    `INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot, updated_at, dirty)
     VALUES ('se-1', 'st-1', 'ex-1', 1, 'Supino', 'Peito', 'Composto', ?, 0)`,
    [T],
  );
  // Aquecimento 50kg×25 (Epley 91.7 — MAIOR que o da válida) + válida 80kg×2 (85.3).
  await db.run(
    `INSERT INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes, updated_at, dirty)
     VALUES ('sr-aq', 'se-1', 'aquecimento', 1, 50, 25, ?, 0)`,
    [T],
  );
  await db.run(
    `INSERT INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes, updated_at, dirty)
     VALUES ('sr-ok', 'se-1', 'valida', 2, 80, 2, ?, 0)`,
    [T],
  );
});

describe('dashboard exclui aquecimento das agregações (como o histórico)', () => {
  it('volume e melhor 1RM da sessão contam só séries válidas', async () => {
    const stats = await repo.getStats();
    const sessao = stats.evolucaoPorTreino[0]!.sessoes[0]!;

    expect(sessao.volumeTotal).toBe(160); // 80×2 — sem os 1250 do aquecimento
    expect(sessao.melhorOrm).toBe(85.3); // Epley da válida, não os 91.7 do aquecimento
  });

  it('recorde pessoal ignora aquecimento', async () => {
    const stats = await repo.getStats();

    expect(stats.recordesPessoais[0]?.melhorOrmKg).toBe(85.3);
  });

  it('evolução por exercício ignora aquecimento no melhor 1RM', async () => {
    const evolucao = await repo.getEvolucaoExercicios('tr-1');

    expect(evolucao[0]!.sessoes[0]!.melhorOrm).toBe(85.3);
  });
});
