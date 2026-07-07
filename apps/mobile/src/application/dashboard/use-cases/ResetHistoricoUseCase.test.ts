import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDatabase } from '../../../test/db-setup';
import type { SQLiteDatabaseClient } from '../../../infrastructure/persistence/sqlite/SQLiteDatabaseClient';
import { ResetHistoricoUseCase } from './ResetHistoricoUseCase';

/**
 * Regressão P1-B (auditoria rodada 3): o reset fazia DELETE físico — sem
 * tombstones o servidor ressuscitava tudo no pull seguinte — e não apagava
 * sessões canceladas nem os filhos delas.
 */

const T = '2026-07-01T10:00:00.000Z';

let db: SQLiteDatabaseClient;

interface Row {
  deleted_at: string | null;
  dirty: number;
}

const seedSessao = async (id: string, status: string) => {
  await db.run(
    `INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, status, updated_at, dirty)
     VALUES (?, 'tr-1', 'Treino A', ?, ?, ?, 0)`,
    [id, T, status, T],
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
};

const getRow = (table: string, id: string) =>
  db.getFirst<Row>(`SELECT deleted_at, dirty FROM ${table} WHERE id = ?`, [id]);

beforeEach(async () => {
  db = createTestDatabase();
  await db.run(
    `INSERT INTO treinos (id, name, created_at, updated_at) VALUES ('tr-1', 'Treino A', ?, ?)`,
    [T, T],
  );
  await seedSessao('st-fin', 'finalizada');
  await seedSessao('st-can', 'cancelada');
  await seedSessao('st-and', 'em_andamento');
  await new ResetHistoricoUseCase({ database: db }).execute();
});

describe('ResetHistoricoUseCase — tombstones, não DELETE físico', () => {
  it('tombstona a sessão finalizada e os filhos, marcando dirty para o sync', async () => {
    for (const [table, id] of [
      ['sessao_treinos', 'st-fin'],
      ['sessao_exercicios', 'se-st-fin'],
      ['series_registradas', 'sr-st-fin'],
    ] as const) {
      const row = await getRow(table, id);
      expect(row, `${table}/${id} deve continuar existindo (tombstone)`).not.toBeNull();
      expect(row!.deleted_at, `${table}/${id} deve ter deleted_at`).not.toBeNull();
      expect(row!.dirty, `${table}/${id} deve estar dirty`).toBe(1);
    }
  });

  it('tombstona também a sessão cancelada e os filhos dela', async () => {
    for (const [table, id] of [
      ['sessao_treinos', 'st-can'],
      ['sessao_exercicios', 'se-st-can'],
      ['series_registradas', 'sr-st-can'],
    ] as const) {
      const row = await getRow(table, id);
      expect(row, `${table}/${id} deve continuar existindo (tombstone)`).not.toBeNull();
      expect(row!.deleted_at, `${table}/${id} deve ter deleted_at`).not.toBeNull();
      expect(row!.dirty, `${table}/${id} deve estar dirty`).toBe(1);
    }
  });

  it('não toca a sessão em andamento nem o treino', async () => {
    for (const [table, id] of [
      ['sessao_treinos', 'st-and'],
      ['sessao_exercicios', 'se-st-and'],
      ['series_registradas', 'sr-st-and'],
      ['treinos', 'tr-1'],
    ] as const) {
      const row = await getRow(table, id);
      expect(row).not.toBeNull();
      expect(row!.deleted_at, `${table}/${id} não deve ser tombstoned`).toBeNull();
    }
  });
});
