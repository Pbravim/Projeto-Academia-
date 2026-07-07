import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDatabase } from '../../../test/db-setup';
import type { SQLiteDatabaseClient } from '../../../infrastructure/persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteTreinoRepository } from '../../../infrastructure/treinos/SQLiteTreinoRepository';
import { SQLiteTreinoExercicioRepository } from '../../../infrastructure/treinos/SQLiteTreinoExercicioRepository';
import { SQLiteSessaoTreinoRepository } from '../../../infrastructure/sessoes/SQLiteSessaoTreinoRepository';
import { SQLiteSessaoExercicioRepository } from '../../../infrastructure/sessoes/SQLiteSessaoExercicioRepository';
import { SQLiteSerieRegistradaRepository } from '../../../infrastructure/sessoes/SQLiteSerieRegistradaRepository';
import { SQLitePlanoSemanalRepository } from '../../../infrastructure/plano/SQLitePlanoSemanalRepository';
import { DeleteTreinoUseCase } from './DeleteTreinoUseCase';

/**
 * Regressão P1-B (auditoria rodada 3): deletar um treino tombstonava as sessões
 * mas deixava sessao_exercicios/series_registradas vivos, e a instância de
 * produção era criada sem planoSemanalRepository/database — o plano semanal
 * ficava apontando para treino tombstoned e nada rodava em transação.
 */

const T = '2026-07-01T10:00:00.000Z';

let db: SQLiteDatabaseClient;
let useCase: DeleteTreinoUseCase;

interface Row {
  deleted_at: string | null;
  dirty: number;
}

beforeEach(async () => {
  db = createTestDatabase();
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
  await db.run(`UPDATE plano_semanal SET treino_id = 'tr-1' WHERE dia_semana = 'seg'`);

  useCase = new DeleteTreinoUseCase({
    treinoRepository: new SQLiteTreinoRepository(db),
    treinoExercicioRepository: new SQLiteTreinoExercicioRepository(db),
    sessaoTreinoRepository: new SQLiteSessaoTreinoRepository(db),
    sessaoExercicioRepository: new SQLiteSessaoExercicioRepository(db),
    serieRegistradaRepository: new SQLiteSerieRegistradaRepository(db),
    planoSemanalRepository: new SQLitePlanoSemanalRepository(db),
    database: db,
  });
});

const getRow = (table: string, id: string) =>
  db.getFirst<Row>(`SELECT deleted_at, dirty FROM ${table} WHERE id = ?`, [id]);

describe('DeleteTreinoUseCase — cascata completa de tombstones', () => {
  it('tombstona o treino, a sessão e TODOS os filhos da sessão, marcando dirty', async () => {
    await useCase.execute('tr-1');

    for (const [table, id] of [
      ['treinos', 'tr-1'],
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

  it('limpa o plano semanal que apontava para o treino', async () => {
    await useCase.execute('tr-1');

    const dia = await db.getFirst<{ treino_id: string | null }>(
      `SELECT treino_id FROM plano_semanal WHERE dia_semana = 'seg'`,
    );
    expect(dia?.treino_id).toBeNull();
  });
});
