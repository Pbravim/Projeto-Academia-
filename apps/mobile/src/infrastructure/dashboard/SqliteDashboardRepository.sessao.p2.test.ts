import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

import { SqliteDashboardRepository } from './SqliteDashboardRepository';

/**
 * Regressão P2-4/P2-5 (auditoria rodada 3): deletarSessao fazia DELETE físico
 * (sessão sincronizada ressuscitava no pull) e arquivar/desarquivar não setavam
 * dirty/updated_at (arquivamento nunca chegava ao servidor e o LWW ficava errado).
 */

const T = '2026-07-01T10:00:00.000Z';

let db: SQLiteDatabaseClient;
let repo: SqliteDashboardRepository;

interface Row {
  deleted_at: string | null;
  updated_at: string | null;
  dirty: number;
}

const getRow = (table: string, id: string) =>
  db.getFirst<Row>(`SELECT deleted_at, updated_at, dirty FROM ${table} WHERE id = ?`, [id]);

beforeEach(async () => {
  db = createTestDatabase();
  repo = new SqliteDashboardRepository(db);
  await db.run(
    `INSERT INTO treinos (id, name, created_at, updated_at) VALUES ('tr-1', 'Treino A', ?, ?)`,
    [T, T],
  );
  await db.run(
    `INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, status, updated_at, dirty)
     VALUES ('st-1', 'tr-1', 'Treino A', ?, 'finalizada', ?, 0)`,
    [T, T],
  );
  await db.run(
    `INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot, updated_at, dirty)
     VALUES ('se-1', 'st-1', 'ex-1', 1, 'Supino', 'Peito', 'Composto', ?, 0)`,
    [T],
  );
  await db.run(
    `INSERT INTO series_registradas (id, sessao_exercicio_id, ordem, carga_kg, repeticoes, updated_at, dirty)
     VALUES ('sr-1', 'se-1', 1, 80, 8, ?, 0)`,
    [T],
  );
});

describe('deletarSessao — soft delete sincronizável', () => {
  it('tombstona sessão, exercícios e séries (linhas continuam existindo, dirty=1)', async () => {
    await repo.deletarSessao('st-1');

    for (const [table, id] of [
      ['sessao_treinos', 'st-1'],
      ['sessao_exercicios', 'se-1'],
      ['series_registradas', 'sr-1'],
    ] as const) {
      const row = await getRow(table, id);
      expect(row, `${table}/${id} deve continuar existindo (tombstone)`).not.toBeNull();
      expect(row!.deleted_at, `${table}/${id} deve ter deleted_at`).not.toBeNull();
      expect(row!.dirty, `${table}/${id} deve estar dirty`).toBe(1);
    }
  });
});

describe('arquivar/desarquivar — precisam sincronizar', () => {
  it('arquivarSessao seta dirty=1 e avança updated_at', async () => {
    const changes = await repo.arquivarSessao('st-1');
    expect(changes).toBe(1);

    const row = await getRow('sessao_treinos', 'st-1');
    expect(row!.dirty).toBe(1);
    expect(row!.updated_at! > T).toBe(true);
  });

  it('desarquivarSessao seta dirty=1 e avança updated_at', async () => {
    await repo.arquivarSessao('st-1');
    await db.run(`UPDATE sessao_treinos SET dirty = 0, updated_at = ? WHERE id = 'st-1'`, [T]);

    const changes = await repo.desarquivarSessao('st-1');
    expect(changes).toBe(1);

    const row = await getRow('sessao_treinos', 'st-1');
    expect(row!.dirty).toBe(1);
    expect(row!.updated_at! > T).toBe(true);
  });
});
