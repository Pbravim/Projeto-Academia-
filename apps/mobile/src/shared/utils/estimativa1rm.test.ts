import { describe, expect, it } from 'vitest';

import { createTestDatabase } from '../../test/db-setup';

import { calcularEstimativa1rm, estimativa1rmSql } from './estimativa1rm';

/**
 * Regressão P3-11 (rodada 3): Epley em reps=1 estimava 3.3% ACIMA da carga
 * realmente levantada — um single de 100kg virava "1RM ~103.3" e recorde falso.
 * Com 1 repetição, o 1RM demonstrado é a própria carga.
 */
describe('calcularEstimativa1rm', () => {
  it('reps=1 devolve a própria carga (1RM demonstrado)', () => {
    expect(calcularEstimativa1rm(100, 1)).toBe(100);
  });

  it('reps>1 segue Epley', () => {
    expect(calcularEstimativa1rm(100, 5)).toBeCloseTo(116.67, 1);
  });
});

describe('estimativa1rmSql — idêntico ao JS', () => {
  it('reps=1 devolve a própria carga também no SQL', async () => {
    const db = createTestDatabase();
    const T = '2026-07-01T10:00:00.000Z';
    await db.run(`INSERT INTO treinos (id, name, created_at, updated_at) VALUES ('tr-1', 'A', ?, ?)`, [T, T]);
    await db.run(
      `INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, status) VALUES ('st-1', 'tr-1', 'A', ?, 'finalizada')`,
      [T],
    );
    await db.run(
      `INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot) VALUES ('se-1', 'st-1', 'ex-1', 1, 'Supino', 'Peito', 'C')`,
    );
    await db.run(
      `INSERT INTO series_registradas (id, sessao_exercicio_id, ordem, carga_kg, repeticoes) VALUES ('sr-1', 'se-1', 1, 100, 1)`,
    );

    const row = await db.getFirst<{ orm: number }>(
      `SELECT ${estimativa1rmSql('sr')} AS orm FROM series_registradas sr WHERE sr.id = 'sr-1'`,
    );
    expect(row?.orm).toBe(100);
  });
});
