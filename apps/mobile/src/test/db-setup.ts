import Database from 'better-sqlite3';
import type { SQLiteDatabaseClient, SQLiteBindParams } from '../infrastructure/persistence/sqlite/SQLiteDatabaseClient';
import { migrations, splitSqlStatements } from '../infrastructure/persistence/sqlite/migrations';

/**
 * Creates an in-memory SQLite database suitable for testing.
 *
 * Runs the REAL production migrations (v1→vN) from migrations.ts — never a
 * hand-maintained copy. A divergent copy (with foreign_keys=OFF) masked two
 * P0 data-integrity bugs in the 2026-07-06 audit (rodada 3); keeping the
 * schema byte-identical to production is the whole point of this helper.
 */
export function createTestDatabase(): SQLiteDatabaseClient {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  // Same semantics as ExpoSQLiteDatabaseClient.runMigrationStep: execute per
  // statement, swallowing only "duplicate column name" (v5 is an intentional
  // safety-net that re-runs v3's ALTERs).
  for (const migration of migrations) {
    for (const stmt of splitSqlStatements(migration)) {
      try {
        db.exec(stmt + ';');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!/duplicate column name/i.test(msg)) throw err;
      }
    }
  }

  // Wrap better-sqlite3 in our SQLiteDatabaseClient interface
  return new BetterSQLiteAdapter(db);
}

class BetterSQLiteAdapter implements SQLiteDatabaseClient {
  constructor(private readonly db: Database) {}

  async exec(statement: string): Promise<void> {
    this.db.exec(statement);
  }

  async run(statement: string, params?: SQLiteBindParams): Promise<void> {
    const stmt = this.db.prepare(statement);
    if (params) {
      stmt.run(...params);
    } else {
      stmt.run();
    }
  }

  async runWithChanges(statement: string, params?: SQLiteBindParams): Promise<number> {
    const stmt = this.db.prepare(statement);
    const result = params ? stmt.run(...params) : stmt.run();
    return result.changes;
  }

  async getFirst<T>(statement: string, params?: SQLiteBindParams): Promise<T | null> {
    const stmt = this.db.prepare(statement);
    const result = params ? stmt.get(...params) : stmt.get();
    return (result ?? null) as T | null;
  }

  async getAll<T>(statement: string, params?: SQLiteBindParams): Promise<T[]> {
    const stmt = this.db.prepare(statement);
    const results = params ? stmt.all(...params) : stmt.all();
    return results as T[];
  }

  async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
    // For synchronous better-sqlite3, we wrap the transaction in BEGIN/COMMIT
    // Note: the fn() is async, so we just execute it and handle rollback on error
    try {
      this.db.exec('BEGIN TRANSACTION');
      const result = await fn();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}
