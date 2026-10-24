import { beforeEach, describe, expect, it } from 'vitest';

import { SerieRegistrada } from '../../domain/sessoes/entities/SerieRegistrada';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

import { SQLiteSerieRegistradaRepository } from './SQLiteSerieRegistradaRepository';

let db: SQLiteDatabaseClient;
let repo: SQLiteSerieRegistradaRepository;

beforeEach(async () => {
  db = createTestDatabase();
  repo = new SQLiteSerieRegistradaRepository(db);
  await db.run(
    "INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, status) VALUES ('sessao-1', NULL, 'Treino livre', '2026-01-01T00:00:00.000Z', 'em_andamento')"
  );
  await db.run(
    "INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot) VALUES ('se-1', 'sessao-1', 'ex-1', 1, 'Supino', 'peito', 'composto')"
  );
});

interface SavedRow {
  ordem: number; carga_kg: number | null; repeticoes: number | null; observacao: string | null;
  tipo_serie: string; duracao_segundos: number | null; distancia_metros: number | null;
  intensidade: number | null; server_rev: number; dirty: number; deleted_at: string | null; updated_at: string;
}

const SELECT_ROW = `SELECT ordem, carga_kg, repeticoes, observacao, tipo_serie, duracao_segundos, distancia_metros,
                     intensidade, server_rev, dirty, deleted_at, updated_at FROM series_registradas WHERE id = ?`;

describe('SQLiteSerieRegistradaRepository — save preserva server_rev no re-save (#62)', () => {
  it('re-save aplica TODAS as colunas do domínio e preserva server_rev setado por fora (ex.: sync)', async () => {
    const serie = SerieRegistrada.create({
      id: 'sr-62', sessaoExercicioId: 'se-1', ordem: 1, cargaKg: 20, repeticoes: 10, observacao: 'facil',
    });
    await repo.save(serie);

    await db.run(
      "UPDATE series_registradas SET server_rev = 5, dirty = 0, updated_at = '2000-01-01T00:00:00.000Z' WHERE id = ?",
      ['sr-62']
    );

    const atualizada = SerieRegistrada.restore({
      id: 'sr-62', sessaoExercicioId: 'se-1', tipoSerie: 'aquecimento', ordem: 2,
      cargaKg: 30, repeticoes: 8, observacao: 'dificil', duracaoSegundos: null, distanciaMetros: null, intensidade: null,
    });
    await repo.save(atualizada);

    const row = await db.getFirst<SavedRow>(SELECT_ROW, ['sr-62']);

    expect(row?.ordem).toBe(2);
    expect(row?.carga_kg).toBe(30);
    expect(row?.repeticoes).toBe(8);
    expect(row?.observacao).toBe('dificil');
    expect(row?.tipo_serie).toBe('aquecimento');
    expect(row?.server_rev).toBe(5);
    expect(row?.dirty).toBe(1);
    expect(row?.deleted_at).toBeNull();
    expect(row?.updated_at).not.toBe('2000-01-01T00:00:00.000Z');
  });
});
