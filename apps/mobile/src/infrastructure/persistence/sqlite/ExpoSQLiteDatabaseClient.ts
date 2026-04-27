import * as SQLite from 'expo-sqlite';

import type { AppLogger } from '../../logging/AppLogger';
import type { SQLiteBindParams, SQLiteDatabaseClient } from './SQLiteDatabaseClient';

export class ExpoSQLiteDatabaseClient implements SQLiteDatabaseClient {
  private databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
  private migrationPromise: Promise<void> | null = null;

  constructor(
    private readonly databaseName: string,
    private readonly logger: AppLogger
  ) {}

  async exec(statement: string): Promise<void> {
    const database = await this.getReadyDatabase();
    await database.execAsync(statement);
  }

  async run(statement: string, params: SQLiteBindParams = []): Promise<void> {
    const database = await this.getReadyDatabase();
    await database.runAsync(statement, params);
  }

  async getFirst<T>(statement: string, params: SQLiteBindParams = []): Promise<T | null> {
    const database = await this.getReadyDatabase();
    const row = await database.getFirstAsync<T>(statement, params);
    return row ?? null;
  }

  async getAll<T>(statement: string, params: SQLiteBindParams = []): Promise<T[]> {
    const database = await this.getReadyDatabase();
    return database.getAllAsync<T>(statement, params);
  }

  private async getReadyDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (!this.databasePromise) {
      this.databasePromise = SQLite.openDatabaseAsync(this.databaseName);
    }

    const database = await this.databasePromise;

    if (!this.migrationPromise) {
      this.migrationPromise = this.runMigrations(database);
    }

    await this.migrationPromise;

    return database;
  }

  private async runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
    await database.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        normalized_name TEXT NOT NULL UNIQUE,
        group_muscle TEXT NOT NULL,
        category TEXT NOT NULL,
        equipment TEXT,
        load_unit TEXT NOT NULL,
        is_custom INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    this.logger.info('database.migrated', {
      databaseName: this.databaseName,
    });
  }
}
