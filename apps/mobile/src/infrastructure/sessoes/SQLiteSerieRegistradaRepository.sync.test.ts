import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteSerieRegistradaRepository } from './SQLiteSerieRegistradaRepository';
import { SerieRegistrada } from '../../domain/sessoes/entities/SerieRegistrada';

let db: SQLiteDatabaseClient;
let repo: SQLiteSerieRegistradaRepository;

beforeEach(() => {
  db = createTestDatabase();
  repo = new SQLiteSerieRegistradaRepository(db);
});

/**
 * Round-trip guard for non-strength series across the persistence + sync layer.
 * Regression: series_registradas.carga_kg/repeticoes must be NULLABLE — a cardio
 * or hold serie has no carga/reps, and the row must survive save → getDirty →
 * applyServerRows without loss (the shape sync exchanges with the backend).
 */
describe('SQLiteSerieRegistradaRepository — non-strength sync round-trip', () => {
  it('persists a cardio serie with null carga/reps and the time/intensity metrics', async () => {
    const cardio = SerieRegistrada.restore({
      id: 'sr-cardio', sessaoExercicioId: 'se1', ordem: 0, tipoSerie: 'valida',
      cargaKg: null, repeticoes: null,
      duracaoSegundos: 600, distanciaMetros: 1500, intensidade: 8,
      observacao: null,
    });

    await repo.save(cardio);

    const read = await repo.findById('sr-cardio');
    expect(read?.toPrimitives()).toMatchObject({
      cargaKg: null, repeticoes: null,
      duracaoSegundos: 600, distanciaMetros: 1500, intensidade: 8,
    });
  });

  it('round-trips a hold serie through getDirty → applyServerRows onto a fresh db', async () => {
    const hold = SerieRegistrada.restore({
      id: 'sr-hold', sessaoExercicioId: 'se1', ordem: 0, tipoSerie: 'valida',
      cargaKg: null, repeticoes: null,
      duracaoSegundos: 45, distanciaMetros: null, intensidade: null,
      observacao: 'prancha',
    });
    await repo.save(hold);

    const dirty = await repo.getDirty();
    expect(dirty).toHaveLength(1);
    expect(dirty[0]).toMatchObject({ id: 'sr-hold', cargaKg: null, repeticoes: null, duracaoSegundos: 45 });

    // Apply the synced rows onto a brand-new device/db.
    const db2 = createTestDatabase();
    const repo2 = new SQLiteSerieRegistradaRepository(db2);
    await repo2.applyServerRows(dirty);

    const applied = await repo2.findById('sr-hold');
    expect(applied?.toPrimitives()).toMatchObject({
      cargaKg: null, repeticoes: null, duracaoSegundos: 45, observacao: 'prancha',
    });
  });
});
