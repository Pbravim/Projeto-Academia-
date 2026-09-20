import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * setSetting() so existe em ExpoSQLiteDatabaseClient (fora da interface
 * SQLiteDatabaseClient usada por src/test/db-setup.ts), entao o espelho
 * better-sqlite3 dos testes de repositorio nao serve aqui. Este teste mocka
 * 'expo-sqlite' com um adaptador que delega para um banco better-sqlite3 REAL,
 * assim as migracoes de producao rodam de verdade e o SQL de setSetting e
 * exercitado contra semantica SQLite real (nao um double).
 */

let realDb: Database.Database;

function makeRealAsyncDatabase(db: Database.Database) {
  return {
    execAsync: async (sql: string) => {
      db.exec(sql);
    },
    runAsync: async (sql: string, params: unknown[] = []) => {
      const info = db.prepare(sql).run(...params);
      return { changes: info.changes };
    },
    getFirstAsync: async (sql: string, params: unknown[] = []) => {
      if (sql === 'PRAGMA user_version') {
        return { user_version: db.pragma('user_version', { simple: true }) };
      }
      return db.prepare(sql).get(...params) ?? undefined;
    },
    getAllAsync: async (sql: string, params: unknown[] = []) => {
      if (sql === 'PRAGMA foreign_key_check') return db.pragma('foreign_key_check');
      return db.prepare(sql).all(...params);
    },
    closeAsync: async () => {
      db.close();
    },
  };
}

vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: vi.fn(async () => makeRealAsyncDatabase(realDb)),
}));

const fakeLogger = { info: vi.fn(), error: vi.fn() };

beforeEach(() => {
  realDb = new Database(':memory:');
  fakeLogger.info.mockClear();
  fakeLogger.error.mockClear();
});

interface SettingRow {
  value: string; server_rev: number | null; dirty: number; deleted_at: string | null; updated_at: string | null;
}

describe('ExpoSQLiteDatabaseClient.setSetting — upsert preserva server_rev e deleted_at (#62)', () => {
  it('re-save aplica value/updated_at/dirty e preserva server_rev/deleted_at setados por fora (ex.: sync)', async () => {
    const { ExpoSQLiteDatabaseClient } = await import('./ExpoSQLiteDatabaseClient');
    const client = new ExpoSQLiteDatabaseClient('test.db', fakeLogger);

    await client.setSetting('tema', 'claro');

    // Simula linha ja sincronizada (dirty = 0, updated_at antigo) com metadados de
    // servidor/tombstone que o setSetting() local nao deve tocar.
    await client.run(
      "UPDATE settings SET server_rev = 5, dirty = 0, deleted_at = '2020-01-01T00:00:00.000Z', updated_at = '2000-01-01T00:00:00.000Z' WHERE key = ?",
      ['tema']
    );

    await client.setSetting('tema', 'escuro');

    const row = await client.getFirst<SettingRow>(
      'SELECT value, server_rev, dirty, deleted_at, updated_at FROM settings WHERE key = ?',
      ['tema']
    );

    expect(row?.value).toBe('escuro');
    expect(row?.server_rev).toBe(5);
    expect(row?.dirty).toBe(1);
    expect(row?.deleted_at).toBe('2020-01-01T00:00:00.000Z');
    expect(row?.updated_at).not.toBe('2000-01-01T00:00:00.000Z');
  });
});
