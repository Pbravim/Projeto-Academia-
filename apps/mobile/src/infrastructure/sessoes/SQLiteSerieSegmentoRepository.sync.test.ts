import { beforeEach, describe, expect, it } from 'vitest';

import { SerieSegmento } from '../../domain/sessoes/entities/SerieSegmento';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

import { SQLiteSerieSegmentoRepository } from './SQLiteSerieSegmentoRepository';

let db: SQLiteDatabaseClient;
let repo: SQLiteSerieSegmentoRepository;

async function seedParents(target: SQLiteDatabaseClient, serieId = 'sr1'): Promise<void> {
  await target.run(
    `INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, status)
     VALUES ('s1', 'tr1', 'Treino Teste', '2026-07-01T10:00:00.000Z', 'em_andamento')`
  );
  await target.run(
    `INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot)
     VALUES ('se1', 's1', 'e1', 0, 'X', 'Peito', 'Composto')`
  );
  await target.run(
    `INSERT INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes)
     VALUES (?, 'se1', 'valida', 1, 60, 8)`,
    [serieId]
  );
}

beforeEach(async () => {
  db = createTestDatabase();
  repo = new SQLiteSerieSegmentoRepository(db);
  await seedParents(db);
});

describe('SQLiteSerieSegmentoRepository — sync round-trip', () => {
  it('round-trips a degrau through save → getDirty → applyServerRows onto a fresh db', async () => {
    const degrau = SerieSegmento.create({
      id: 'seg-1', serieId: 'sr1', ordem: 2, cargaKg: 40, repeticoes: 6, descansoSegundos: 30,
    });
    await repo.save(degrau);

    const dirty = await repo.getDirty();
    expect(dirty).toHaveLength(1);
    expect(dirty[0]).toMatchObject({
      id: 'seg-1', serieId: 'sr1', ordem: 2, cargaKg: 40, repeticoes: 6, descansoSegundos: 30,
    });

    const db2 = createTestDatabase();
    await seedParents(db2);
    const repo2 = new SQLiteSerieSegmentoRepository(db2);
    await repo2.applyServerRows(dirty);

    const applied = await repo2.findById('seg-1');
    expect(applied?.toPrimitives()).toMatchObject({
      serieId: 'sr1', ordem: 2, cargaKg: 40, repeticoes: 6, descansoSegundos: 30,
    });
  });

  it('echo-back do servidor não sobrescreve uma linha local dirty mais nova', async () => {
    const degrau = SerieSegmento.create({
      id: 'seg-2', serieId: 'sr1', ordem: 2, cargaKg: 40, repeticoes: 6, descansoSegundos: 30,
    });
    await repo.save(degrau);
    const [dirtyRow] = await repo.getDirty();

    // Edição local mais nova que o echo do servidor (updatedAt do echo é mais antigo).
    await repo.applyServerRows([{ ...dirtyRow, cargaKg: 999, updatedAt: '2000-01-01T00:00:00.000Z' }]);

    const stillDirty = await repo.findById('seg-2');
    expect(stillDirty?.toPrimitives().cargaKg).toBe(40);
  });

  it('tombstone do servidor aplica (soft-delete local)', async () => {
    const degrau = SerieSegmento.create({
      id: 'seg-3', serieId: 'sr1', ordem: 2, cargaKg: 40, repeticoes: 6, descansoSegundos: 30,
    });
    await repo.save(degrau);
    const [dirtyRow] = await repo.getDirty();
    const futureIso = new Date(Date.now() + 60_000).toISOString();

    await repo.applyServerRows([{ ...dirtyRow, deletedAt: futureIso, updatedAt: futureIso }]);

    expect(await repo.findById('seg-3')).toBeNull();
  });
});
