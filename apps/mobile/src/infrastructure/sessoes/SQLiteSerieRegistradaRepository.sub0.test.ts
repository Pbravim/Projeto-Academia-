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

function make(id: string, seId: string): SerieRegistrada {
  return SerieRegistrada.restore({
    id, sessaoExercicioId: seId, ordem: 0, cargaKg: 50, repeticoes: 10,
    observacao: null, tipoSerie: 'valida',
  });
}

describe('SQLiteSerieRegistradaRepository soft-delete', () => {
  it('delete tombstones; reads hide it', async () => {
    await repo.save(make('sr1', 'se1'));
    await repo.delete('sr1');
    expect(await repo.findById('sr1')).toBeNull();
    expect(await repo.listBySessaoExercicioId('se1')).toHaveLength(0);
    expect(await repo.countBySessaoExercicioId('se1')).toBe(0);
  });

  it('deleteBySessaoExercicioId and update stamp dirty', async () => {
    await repo.save(make('sr1', 'se1'));
    await repo.update('sr1', { cargaKg: 60, repeticoes: 8 });
    const row = await db.getFirst<{ dirty: number; updated_at: string }>(
      'SELECT dirty, updated_at FROM series_registradas WHERE id = ?', ['sr1']
    );
    expect(row?.dirty).toBe(1);
    expect(row?.updated_at).toMatch(/Z$/);

    await repo.deleteBySessaoExercicioId('se1');
    expect(await repo.listBySessaoExercicioId('se1')).toHaveLength(0);
  });
});
