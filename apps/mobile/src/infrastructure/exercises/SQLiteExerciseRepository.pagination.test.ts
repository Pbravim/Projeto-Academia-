import { describe, expect, it, vi } from 'vitest';

import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

import { SQLiteExerciseRepository } from './SQLiteExerciseRepository';

function makeMockDb(): SQLiteDatabaseClient {
  return {
    getAll: vi.fn().mockResolvedValue([]),
    getFirst: vi.fn().mockResolvedValue(null),
    run: vi.fn().mockResolvedValue(undefined),
    exec: vi.fn().mockResolvedValue(undefined),
    runWithChanges: vi.fn().mockResolvedValue(0),
    withTransaction: vi.fn((fn: () => Promise<unknown>) => fn()),
  } as unknown as SQLiteDatabaseClient;
}

describe('SQLiteExerciseRepository.list — pagination', () => {
  it('passes limit and offset as bind params, not string interpolation', async () => {
    const db = makeMockDb();
    const repo = new SQLiteExerciseRepository(db);

    await repo.list({ limit: 20, offset: 40 });

    expect(db.getAll).toHaveBeenCalledOnce();
    const [sql, params] = (db.getAll as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];

    // SQL must NOT contain the literal numbers 20 or 40
    expect(sql).not.toContain('20');
    expect(sql).not.toContain('40');

    // Values must be passed as bind parameters
    expect(params).toContain(20);
    expect(params).toContain(40);
    expect(sql).toContain('LIMIT ?');
    expect(sql).toContain('OFFSET ?');
  });

  it('calls without params when no pagination options provided', async () => {
    const db = makeMockDb();
    const repo = new SQLiteExerciseRepository(db);

    await repo.list();

    expect(db.getAll).toHaveBeenCalledOnce();
    const [sql, params] = (db.getAll as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[] | undefined];

    expect(sql).not.toContain('LIMIT');
    expect(params).toBeUndefined();
  });

  it('uses offset 0 when limit is provided without explicit offset', async () => {
    const db = makeMockDb();
    const repo = new SQLiteExerciseRepository(db);

    await repo.list({ limit: 10 });

    const [, params] = (db.getAll as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
    expect(params).toEqual([10, 0]);
  });
});
