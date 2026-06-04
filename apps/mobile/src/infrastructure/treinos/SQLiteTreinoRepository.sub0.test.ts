import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteTreinoRepository } from './SQLiteTreinoRepository';
import { Treino } from '../../domain/treinos/entities/Treino';

let db: SQLiteDatabaseClient;
let repo: SQLiteTreinoRepository;

beforeEach(() => {
  db = createTestDatabase();
  repo = new SQLiteTreinoRepository(db);
});

function makeTreino(id: string, name: string): Treino {
  return Treino.create({ id, name, createdAt: new Date('2026-01-01T00:00:00.000Z') });
}

describe('SQLiteTreinoRepository soft-delete', () => {
  it('stamps dirty=1 and updated_at on save', async () => {
    await repo.save(makeTreino('t1', 'Treino A'));
    const row = await db.getFirst<{ dirty: number; updated_at: string }>(
      'SELECT dirty, updated_at FROM treinos WHERE id = ?', ['t1']
    );
    expect(row?.dirty).toBe(1);
    expect(row?.updated_at).toMatch(/Z$/);
  });

  it('delete tombstones the row instead of removing it', async () => {
    await repo.save(makeTreino('t1', 'Treino A'));
    await repo.delete('t1');

    expect(await repo.findById('t1')).toBeNull();
    expect(await repo.list()).toHaveLength(0);

    const row = await db.getFirst<{ deleted_at: string | null; dirty: number }>(
      'SELECT deleted_at, dirty FROM treinos WHERE id = ?', ['t1']
    );
    expect(row?.deleted_at).toMatch(/Z$/);
    expect(row?.dirty).toBe(1);
  });
});
