import { describe, expect, it, vi } from 'vitest';

import type { SQLiteBindParams, SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteHistoricoRepository } from './SQLiteHistoricoRepository';

function makeIds(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `ex-${i + 1}`);
}

function makeMockDatabase(): SQLiteDatabaseClient {
  return {
    getAll: vi.fn().mockResolvedValue([]),
    getFirst: vi.fn().mockResolvedValue(null),
    run: vi.fn().mockResolvedValue({ rowsAffected: 0 }),
    withTransaction: vi.fn((fn: () => Promise<unknown>) => fn()),
    execAsync: vi.fn().mockResolvedValue(undefined),
    checkpointWal: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    getSetting: vi.fn().mockResolvedValue(null),
    setSetting: vi.fn().mockResolvedValue(undefined),
    get databaseFileName() { return 'test.db'; },
    get databaseName() { return 'test'; },
  } as unknown as SQLiteDatabaseClient;
}

describe('SQLiteHistoricoRepository.getHistoricoExercicios', () => {
  it('returns empty map for empty input without querying the DB', async () => {
    const db = makeMockDatabase();
    const repo = new SQLiteHistoricoRepository(db);

    const result = await repo.getHistoricoExercicios([]);

    expect(result.size).toBe(0);
    expect(db.getAll).not.toHaveBeenCalled();
  });

  it('issues a single query for 999 IDs', async () => {
    const db = makeMockDatabase();
    const repo = new SQLiteHistoricoRepository(db);

    await repo.getHistoricoExercicios(makeIds(999));

    expect(db.getAll).toHaveBeenCalledTimes(1);
    const [sql, params] = (db.getAll as ReturnType<typeof vi.fn>).mock.calls[0] as [string, SQLiteBindParams];
    expect((params as string[]).length).toBe(999);
    expect(sql).toContain('IN (');
  });

  it('issues two queries for 1000 IDs (999 + 1)', async () => {
    const db = makeMockDatabase();
    const repo = new SQLiteHistoricoRepository(db);

    await repo.getHistoricoExercicios(makeIds(1000));

    expect(db.getAll).toHaveBeenCalledTimes(2);
    const firstParams = (db.getAll as ReturnType<typeof vi.fn>).mock.calls[0][1] as string[];
    const secondParams = (db.getAll as ReturnType<typeof vi.fn>).mock.calls[1][1] as string[];
    expect(firstParams.length).toBe(999);
    expect(secondParams.length).toBe(1);
  });

  it('issues three queries for 2500 IDs (999 + 999 + 502)', async () => {
    const db = makeMockDatabase();
    const repo = new SQLiteHistoricoRepository(db);

    await repo.getHistoricoExercicios(makeIds(2500));

    expect(db.getAll).toHaveBeenCalledTimes(3);
  });
});
