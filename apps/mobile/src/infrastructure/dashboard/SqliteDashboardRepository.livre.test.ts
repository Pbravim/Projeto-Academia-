import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

import { SqliteDashboardRepository } from './SqliteDashboardRepository';

const T = '2026-09-13T10:00:00.000Z';

let db: SQLiteDatabaseClient;
let repo: SqliteDashboardRepository;

async function seedSessaoComSerie(id: string, treinoId: string | null, treinoNome: string) {
  await db.run(
    `INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, status, updated_at, dirty)
     VALUES (?, ?, ?, ?, 'finalizada', ?, 0)`,
    [id, treinoId, treinoNome, T, T],
  );
  await db.run(
    `INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot, updated_at, dirty)
     VALUES (?, ?, 'ex-1', 1, 'Supino', 'Peito', 'Composto', ?, 0)`,
    [`se-${id}`, id, T],
  );
  await db.run(
    `INSERT INTO series_registradas (id, sessao_exercicio_id, ordem, carga_kg, repeticoes, updated_at, dirty)
     VALUES (?, ?, 1, 80, 8, ?, 0)`,
    [`sr-${id}`, `se-${id}`, T],
  );
}

beforeEach(async () => {
  db = createTestDatabase();
  repo = new SqliteDashboardRepository(db);
  await db.run(`INSERT INTO treinos (id, name, created_at, updated_at) VALUES ('tr-1', 'Treino A', ?, ?)`, [T, T]);
});

describe('SqliteDashboardRepository — sessoes sem treino agrupadas (#33, D1)', () => {
  it('agrupa todas as sessoes livres num unico bucket com treinoId null', async () => {
    await seedSessaoComSerie('st-livre-1', null, 'Treino livre 12/09');
    await seedSessaoComSerie('st-livre-2', null, 'Treino livre 13/09');
    await seedSessaoComSerie('st-treino-1', 'tr-1', 'Treino A');

    const stats = await repo.getStats();

    expect(stats.totalSessoes).toBe(3);
    const livre = stats.evolucaoPorTreino.find((g) => g.treinoId === null);
    expect(livre).toBeDefined();
    expect(livre!.sessoes).toHaveLength(2);
    expect(livre!.treinoNome).toBe('');

    const comTreino = stats.evolucaoPorTreino.find((g) => g.treinoId === 'tr-1');
    expect(comTreino).toBeDefined();
    expect(comTreino!.sessoes).toHaveLength(1);

    expect(stats.evolucaoPorTreino).toHaveLength(2);
  });
});
