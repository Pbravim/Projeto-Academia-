import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteExerciseRepository } from './SQLiteExerciseRepository';
import { Exercise } from '../../domain/exercises/entities/Exercise';

let db: SQLiteDatabaseClient;
let repo: SQLiteExerciseRepository;

beforeEach(() => {
  db = createTestDatabase();
  repo = new SQLiteExerciseRepository(db);
});

function make(id: string, name: string): Exercise {
  return Exercise.create({ id, name, groupMuscle: 'Peito', createdAt: new Date('2026-01-01T00:00:00.000Z'), isCustom: true });
}

describe('SQLiteExerciseRepository soft-delete', () => {
  it('hides tombstoned exercises from list and findByNormalizedName', async () => {
    await repo.save(make('e1', 'Meu Exercicio'));
    await repo.delete('e1');
    expect(await repo.findById('e1')).toBeNull();
    expect(await repo.findByNormalizedName('meu exercicio')).toBeNull();
    expect((await repo.list()).some((e) => e.toPrimitives().id === 'e1')).toBe(false);
  });

  it('resurrects a tombstoned row when the same id is saved again', async () => {
    await repo.save(make('e1', 'Meu Exercicio'));
    await repo.delete('e1');
    await repo.save(make('e1', 'Meu Exercicio'));
    const found = await repo.findByNormalizedName('meu exercicio');
    expect(found?.toPrimitives().id).toBe('e1');
  });

  it('updateMedia writes an ISO-Z timestamp and dirty=1', async () => {
    await repo.save(make('e1', 'Meu Exercicio'));
    await repo.updateMedia('e1', 'https://x/y.gif', null);
    const row = await db.getFirst<{ updated_at: string; dirty: number }>(
      'SELECT updated_at, dirty FROM exercises WHERE id = ?', ['e1']
    );
    expect(row?.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(row?.dirty).toBe(1);
  });
});
