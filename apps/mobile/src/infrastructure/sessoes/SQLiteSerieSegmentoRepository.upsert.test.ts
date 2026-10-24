import { beforeEach, describe, expect, it } from 'vitest';

import { SerieSegmento } from '../../domain/sessoes/entities/SerieSegmento';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

import { SQLiteSerieSegmentoRepository } from './SQLiteSerieSegmentoRepository';

let db: SQLiteDatabaseClient;
let repo: SQLiteSerieSegmentoRepository;

beforeEach(async () => {
  db = createTestDatabase();
  repo = new SQLiteSerieSegmentoRepository(db);
  await db.run(
    "INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, status) VALUES ('sessao-1', NULL, 'Treino livre', '2026-01-01T00:00:00.000Z', 'em_andamento')"
  );
  await db.run(
    "INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot) VALUES ('se-1', 'sessao-1', 'ex-1', 1, 'Supino', 'peito', 'composto')"
  );
  await db.run(
    "INSERT INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes) VALUES ('sr-1', 'se-1', 'valida', 1, 20, 10)"
  );
});

interface SavedRow {
  ordem: number; carga_kg: number | null; repeticoes: number | null; descanso_segundos: number | null;
  server_rev: number; dirty: number; deleted_at: string | null; updated_at: string;
}

const SELECT_ROW = 'SELECT ordem, carga_kg, repeticoes, descanso_segundos, server_rev, dirty, deleted_at, updated_at FROM serie_segmentos WHERE id = ?';

describe('SQLiteSerieSegmentoRepository — save preserva server_rev no re-save (#62)', () => {
  it('re-save aplica TODAS as colunas do domínio e preserva server_rev setado por fora (ex.: sync)', async () => {
    const segmento = SerieSegmento.create({
      id: 'seg-62', serieId: 'sr-1', ordem: 2, cargaKg: 15, repeticoes: 8, descansoSegundos: 20,
    });
    await repo.save(segmento);

    await db.run(
      "UPDATE serie_segmentos SET server_rev = 5, dirty = 0, updated_at = '2000-01-01T00:00:00.000Z' WHERE id = ?",
      ['seg-62']
    );

    const atualizado = SerieSegmento.restore({
      id: 'seg-62', serieId: 'sr-1', ordem: 3, cargaKg: 12, repeticoes: 6, descansoSegundos: 30,
    });
    await repo.save(atualizado);

    const row = await db.getFirst<SavedRow>(SELECT_ROW, ['seg-62']);

    expect(row?.ordem).toBe(3);
    expect(row?.carga_kg).toBe(12);
    expect(row?.repeticoes).toBe(6);
    expect(row?.descanso_segundos).toBe(30);
    expect(row?.server_rev).toBe(5);
    expect(row?.dirty).toBe(1);
    expect(row?.deleted_at).toBeNull();
    expect(row?.updated_at).not.toBe('2000-01-01T00:00:00.000Z');
  });
});
