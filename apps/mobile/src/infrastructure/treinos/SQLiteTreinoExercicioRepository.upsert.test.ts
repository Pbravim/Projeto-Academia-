import { beforeEach, describe, expect, it } from 'vitest';

import { TreinoExercicio } from '../../domain/treinos/entities/TreinoExercicio';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

import { SQLiteTreinoExercicioRepository } from './SQLiteTreinoExercicioRepository';

let db: SQLiteDatabaseClient;
let repo: SQLiteTreinoExercicioRepository;

beforeEach(async () => {
  db = createTestDatabase();
  repo = new SQLiteTreinoExercicioRepository(db);
  await db.run(
    "INSERT INTO treinos (id, name, objetivo, created_at, updated_at) VALUES ('treino-1', 'Treino', NULL, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')"
  );
  await db.run(
    "INSERT INTO exercises (id, name, normalized_name, group_muscle, category, load_unit, is_custom, created_at, updated_at) VALUES ('ex-1', 'Supino', 'supino', 'peito', 'composto', 'kg', 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')"
  );
});

interface SavedRow {
  ordem: number; series_recomendadas: number | null; execucoes_recomendadas: number | null;
  carga_padrao: number | null; tempo_descanso_segundos: number | null; metodo: string | null;
  grupo_id: string | null; duracao_recomendada_segundos: number | null;
  distancia_recomendada_metros: number | null; intensidade_recomendada: number | null;
  server_rev: number; dirty: number; deleted_at: string | null; updated_at: string;
}

const SELECT_ROW = `SELECT ordem, series_recomendadas, execucoes_recomendadas, carga_padrao,
                     tempo_descanso_segundos, metodo, grupo_id, duracao_recomendada_segundos,
                     distancia_recomendada_metros, intensidade_recomendada, server_rev, dirty, deleted_at, updated_at
                     FROM treino_exercicios WHERE id = ?`;

describe('SQLiteTreinoExercicioRepository — save preserva server_rev no re-save (#62)', () => {
  it('re-save aplica TODAS as colunas do domínio e preserva server_rev setado por fora (ex.: sync)', async () => {
    const te = TreinoExercicio.create({
      id: 'te-62', treinoId: 'treino-1', exercicioId: 'ex-1', ordem: 1,
      seriesRecomendadas: 3, execucoesRecomendadas: 10, cargaPadrao: 20,
      tempoDescansoSegundos: 60, metodo: 'normal', grupoId: null,
      duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null,
    });
    await repo.save(te);

    await db.run(
      "UPDATE treino_exercicios SET server_rev = 5, dirty = 0, updated_at = '2000-01-01T00:00:00.000Z' WHERE id = ?",
      ['te-62']
    );

    const atualizado = TreinoExercicio.restore({
      id: 'te-62', treinoId: 'treino-1', exercicioId: 'ex-1', ordem: 2,
      seriesRecomendadas: 4, execucoesRecomendadas: 12, cargaPadrao: 30,
      tempoDescansoSegundos: 90, metodo: 'drop_set', grupoId: 'g-1',
      duracaoRecomendadaSegundos: 40, distanciaRecomendadaMetros: 100, intensidadeRecomendada: 7,
    });
    await repo.save(atualizado);

    const row = await db.getFirst<SavedRow>(SELECT_ROW, ['te-62']);

    expect(row?.ordem).toBe(2);
    expect(row?.series_recomendadas).toBe(4);
    expect(row?.execucoes_recomendadas).toBe(12);
    expect(row?.carga_padrao).toBe(30);
    expect(row?.tempo_descanso_segundos).toBe(90);
    expect(row?.metodo).toBe('drop_set');
    expect(row?.grupo_id).toBe('g-1');
    expect(row?.duracao_recomendada_segundos).toBe(40);
    expect(row?.distancia_recomendada_metros).toBe(100);
    expect(row?.intensidade_recomendada).toBe(7);
    expect(row?.server_rev).toBe(5);
    expect(row?.dirty).toBe(1);
    expect(row?.deleted_at).toBeNull();
    expect(row?.updated_at).not.toBe('2000-01-01T00:00:00.000Z');
  });
});
