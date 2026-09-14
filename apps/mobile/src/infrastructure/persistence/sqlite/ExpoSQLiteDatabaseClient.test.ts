import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * ExpoSQLiteDatabaseClient nunca tinha teste unitário próprio (só o espelho
 * better-sqlite3 de src/test/db-setup.ts, usado nos testes de repositório).
 * O rebuild da v25 (#33) desliga/religa `foreign_keys` FORA da transação —
 * um caminho que só existe no runner de produção, nunca no espelho — por
 * isso precisa de cobertura própria aqui, com expo-sqlite mockado.
 */

interface FakeDatabase {
  execAsync: ReturnType<typeof vi.fn>;
  getFirstAsync: ReturnType<typeof vi.fn>;
  getAllAsync: ReturnType<typeof vi.fn>;
  runAsync: ReturnType<typeof vi.fn>;
  closeAsync: ReturnType<typeof vi.fn>;
}

let currentVersion = 0;
let fkCheckViolations: unknown[] = [];
let failOnStatement: RegExp | null = null;

function makeFakeDatabase(): FakeDatabase {
  return {
    execAsync: vi.fn(async (sql: string) => {
      if (failOnStatement && failOnStatement.test(sql)) {
        throw new Error(`forced failure: ${sql.slice(0, 40)}`);
      }
      const m = /PRAGMA user_version\s*=\s*(\d+)/.exec(sql);
      if (m) currentVersion = Number(m[1]);
    }),
    getFirstAsync: vi.fn(async (sql: string) => {
      if (sql === 'PRAGMA user_version') return { user_version: currentVersion };
      return undefined;
    }),
    getAllAsync: vi.fn(async (sql: string) => {
      if (sql === 'PRAGMA foreign_key_check') return fkCheckViolations;
      return [];
    }),
    runAsync: vi.fn(async () => ({ changes: 0 })),
    closeAsync: vi.fn(async () => undefined),
  };
}

let fakeDb: FakeDatabase;

vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: vi.fn(async () => fakeDb),
}));

const fakeLogger = { info: vi.fn(), error: vi.fn() };

beforeEach(() => {
  currentVersion = 0;
  fkCheckViolations = [];
  failOnStatement = null;
  fakeDb = makeFakeDatabase();
  fakeLogger.info.mockClear();
  fakeLogger.error.mockClear();
});

describe('ExpoSQLiteDatabaseClient.runMigrations — steps sem FK (#33, D8)', () => {
  it('roda todas as migracoes, desligando/religando foreign_keys so nos steps de MIGRATIONS_SEM_FK', async () => {
    const { ExpoSQLiteDatabaseClient } = await import('./ExpoSQLiteDatabaseClient');
    const { MIGRATIONS_SEM_FK, migrations } = await import('./migrations');

    const client = new ExpoSQLiteDatabaseClient('test.db', fakeLogger);
    await client.exec('SELECT 1');

    const calls = fakeDb.execAsync.mock.calls.map((c) => c[0] as string);
    const semFkStep = [...MIGRATIONS_SEM_FK][0]!;
    const offIdx = calls.indexOf('PRAGMA foreign_keys = OFF;');
    const beginIdxAfterOff = calls.indexOf('BEGIN IMMEDIATE', offIdx);
    expect(offIdx).toBeGreaterThan(-1);
    expect(beginIdxAfterOff).toBeGreaterThan(offIdx);

    const onIdx = calls.indexOf('PRAGMA foreign_keys = ON;', beginIdxAfterOff);
    expect(onIdx).toBeGreaterThan(beginIdxAfterOff);

    const checkCall = fakeDb.getAllAsync.mock.calls.find((c) => c[0] === 'PRAGMA foreign_key_check');
    expect(checkCall).toBeDefined();

    expect(currentVersion).toBe(migrations.length);
    void semFkStep;
  });

  it('lanca erro e religa foreign_keys quando foreign_key_check acusa violacao no step sem FK', async () => {
    fkCheckViolations = [{ table: 'sessao_exercicios' }];

    const { ExpoSQLiteDatabaseClient } = await import('./ExpoSQLiteDatabaseClient');
    const client = new ExpoSQLiteDatabaseClient('test.db', fakeLogger);

    await expect(client.exec('SELECT 1')).rejects.toThrow(/migration_fk_check_failed/);

    const calls = fakeDb.execAsync.mock.calls.map((c) => c[0] as string);
    expect(calls.filter((c) => c === 'PRAGMA foreign_keys = ON;').length).toBeGreaterThan(0);
  });

  it('faz rollback e religa foreign_keys quando o step sem FK falha antes do commit', async () => {
    failOnStatement = /sessao_treinos_new/;

    const { ExpoSQLiteDatabaseClient } = await import('./ExpoSQLiteDatabaseClient');
    const client = new ExpoSQLiteDatabaseClient('test.db', fakeLogger);

    await expect(client.exec('SELECT 1')).rejects.toThrow(/forced failure/);

    const calls = fakeDb.execAsync.mock.calls.map((c) => c[0] as string);
    expect(calls).toContain('ROLLBACK');
    expect(calls.filter((c) => c === 'PRAGMA foreign_keys = ON;').length).toBeGreaterThan(0);
  });
});
