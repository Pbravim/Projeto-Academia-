import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteRegistroPesoRepository } from './SQLiteRegistroPesoRepository';
import { RegistroPeso } from '../../domain/peso/entities/RegistroPeso';

let db: SQLiteDatabaseClient;
let repo: SQLiteRegistroPesoRepository;

beforeEach(() => {
  db = createTestDatabase();
  repo = new SQLiteRegistroPesoRepository(db);
});

function make(id: string): RegistroPeso {
  return RegistroPeso.restore({ id, pesoKg: 80, dataRegistro: '2026-01-01T08:00:00.000Z', observacao: null });
}

describe('SQLiteRegistroPesoRepository soft-delete', () => {
  it('delete tombstones; list/findById hide it; save stamps dirty', async () => {
    await repo.save(make('p1'));
    const saved = await db.getFirst<{ dirty: number }>('SELECT dirty FROM registros_peso WHERE id = ?', ['p1']);
    expect(saved?.dirty).toBe(1);

    await repo.delete('p1');
    expect(await repo.findById('p1')).toBeNull();
    expect(await repo.list()).toHaveLength(0);
    const row = await db.getFirst<{ deleted_at: string | null }>(
      'SELECT deleted_at FROM registros_peso WHERE id = ?', ['p1']
    );
    expect(row?.deleted_at).toMatch(/Z$/);
  });
});
