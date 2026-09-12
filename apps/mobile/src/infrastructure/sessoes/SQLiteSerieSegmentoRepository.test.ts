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
    `INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, status)
     VALUES ('s1', 'tr1', 'Treino Teste', '2026-07-01T10:00:00.000Z', 'em_andamento')`
  );
  await db.run(
    `INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot)
     VALUES ('se1', 's1', 'e1', 0, 'X', 'Peito', 'Composto')`
  );
  await seedSerie(db, 'sr1', 1);
});

async function seedSerie(target: SQLiteDatabaseClient, serieId: string, ordem: number): Promise<void> {
  await target.run(
    `INSERT INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes)
     VALUES (?, 'se1', 'valida', ?, 60, 8)`,
    [serieId, ordem]
  );
}

function make(id: string, serieId: string, ordem = 2): SerieSegmento {
  return SerieSegmento.restore({ id, serieId, ordem, cargaKg: 40, repeticoes: 6, descansoSegundos: null });
}

describe('SQLiteSerieSegmentoRepository', () => {
  it('saves and lists segmentos ordered by ordem', async () => {
    await repo.save(make('seg2', 'sr1', 3));
    await repo.save(make('seg1', 'sr1', 2));

    const list = await repo.listBySerieId('sr1');
    expect(list.map((s) => s.toPrimitives().id)).toEqual(['seg1', 'seg2']);
  });

  it('findById returns null for soft-deleted or missing segmento', async () => {
    await repo.save(make('seg1', 'sr1'));
    await repo.delete('seg1');
    expect(await repo.findById('seg1')).toBeNull();
    expect(await repo.findById('missing')).toBeNull();
  });

  it('listBySerieIds orders by serie_id then ordem and skips soft-deleted', async () => {
    await seedSerie(db, 'sr2', 2);
    await repo.save(make('seg1', 'sr1', 3));
    await repo.save(make('seg2', 'sr1', 2));
    await repo.save(make('seg3', 'sr2', 2));
    await repo.save(make('seg4', 'sr2', 3));
    await repo.delete('seg4');

    const list = await repo.listBySerieIds(['sr1', 'sr2']);
    expect(list.map((s) => s.toPrimitives().id)).toEqual(['seg2', 'seg1', 'seg3']);
  });

  it('listBySerieIds returns empty array for empty input', async () => {
    expect(await repo.listBySerieIds([])).toEqual([]);
  });

  it('maxOrdemBySerieId returns 1 (a serie-mae) when there are no segmentos', async () => {
    expect(await repo.maxOrdemBySerieId('sr1')).toBe(1);
  });

  it('maxOrdemBySerieId counts soft-deleted segmentos so ordem is never reused', async () => {
    await repo.save(make('seg1', 'sr1', 2));
    await repo.save(make('seg2', 'sr1', 3));
    await repo.delete('seg2');

    expect(await repo.maxOrdemBySerieId('sr1')).toBe(3);
  });

  it('deleteBySerieIds tombstones every segmento of the given series and marks dirty', async () => {
    await repo.save(make('seg1', 'sr1', 2));
    await repo.save(make('seg2', 'sr1', 3));

    await repo.deleteBySerieIds(['sr1']);

    expect(await repo.listBySerieId('sr1')).toHaveLength(0);
    const row = await db.getFirst<{ dirty: number; deleted_at: string | null }>(
      'SELECT dirty, deleted_at FROM serie_segmentos WHERE id = ?',
      ['seg1']
    );
    expect(row?.dirty).toBe(1);
    expect(row?.deleted_at).not.toBeNull();
  });

  it('rejects an orphan segmento (FK real, sem serie-mae)', async () => {
    await expect(
      db.run(
        `INSERT INTO serie_segmentos (id, serie_id, ordem, carga_kg, repeticoes, created_at, dirty)
         VALUES ('orphan', 'nao-existe', 2, 40, 6, '2026-07-01T10:00:00.000Z', 1)`
      )
    ).rejects.toThrow();
  });

  it('rejects ordem = 1 via CHECK (a serie-mae ja e o degrau 1)', async () => {
    await expect(
      db.run(
        `INSERT INTO serie_segmentos (id, serie_id, ordem, carga_kg, repeticoes, created_at, dirty)
         VALUES ('seg_bad', 'sr1', 1, 40, 6, '2026-07-01T10:00:00.000Z', 1)`
      )
    ).rejects.toThrow();
  });

  it('cascade: deleting the serie-mae deletes its segmentos (ON DELETE CASCADE)', async () => {
    await repo.save(make('seg1', 'sr1', 2));
    await db.run('DELETE FROM series_registradas WHERE id = ?', ['sr1']);

    const row = await db.getFirst<{ id: string } | null>('SELECT id FROM serie_segmentos WHERE id = ?', ['seg1']);
    expect(row).toBeNull();
  });
});
