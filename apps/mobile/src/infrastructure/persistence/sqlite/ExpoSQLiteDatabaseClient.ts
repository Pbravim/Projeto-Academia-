import * as SQLite from 'expo-sqlite';

import type { AppLogger } from '../../logging/AppLogger';
import type { SQLiteBindParams, SQLiteDatabaseClient } from './SQLiteDatabaseClient';

// Each entry is one migration step. The index+1 equals the PRAGMA user_version stored in the DB
// after that step runs. Never edit a past migration — add a new one at the end instead.
const migrations: string[] = [
  // v1: schema completo do MVP
  `CREATE TABLE IF NOT EXISTS exercises (
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
  CREATE TABLE IF NOT EXISTS treinos (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    objetivo TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS treino_exercicios (
    id TEXT PRIMARY KEY NOT NULL,
    treino_id TEXT NOT NULL REFERENCES treinos(id),
    exercicio_id TEXT NOT NULL REFERENCES exercises(id),
    ordem INTEGER NOT NULL,
    UNIQUE(treino_id, exercicio_id)
  );
  CREATE TABLE IF NOT EXISTS sessao_treinos (
    id TEXT PRIMARY KEY NOT NULL,
    treino_id TEXT NOT NULL,
    treino_nome_snapshot TEXT NOT NULL,
    data_hora_inicio TEXT NOT NULL,
    data_hora_fim TEXT,
    status TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessao_exercicios (
    id TEXT PRIMARY KEY NOT NULL,
    sessao_treino_id TEXT NOT NULL REFERENCES sessao_treinos(id),
    exercicio_id TEXT NOT NULL,
    ordem INTEGER NOT NULL,
    nome_snapshot TEXT NOT NULL,
    grupo_muscular_snapshot TEXT NOT NULL,
    categoria_snapshot TEXT NOT NULL,
    equipamento_snapshot TEXT,
    realizado INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS series_registradas (
    id TEXT PRIMARY KEY NOT NULL,
    sessao_exercicio_id TEXT NOT NULL REFERENCES sessao_exercicios(id),
    tipo_serie TEXT NOT NULL,
    ordem INTEGER NOT NULL,
    carga_kg REAL NOT NULL,
    repeticoes INTEGER NOT NULL,
    observacao TEXT
  );
  CREATE TABLE IF NOT EXISTS registros_peso (
    id TEXT PRIMARY KEY NOT NULL,
    peso_kg REAL NOT NULL,
    data_registro TEXT NOT NULL,
    observacao TEXT
  );`,
];

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
    await database.execAsync('PRAGMA journal_mode = WAL;');

    const versionRow = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const currentVersion = versionRow?.user_version ?? 0;

    for (let i = currentVersion; i < migrations.length; i++) {
      await database.execAsync(migrations[i]);
      await database.execAsync(`PRAGMA user_version = ${i + 1}`);
      this.logger.info('database.migration_applied', { version: i + 1 });
    }

    this.logger.info('database.ready', {
      databaseName: this.databaseName,
      version: Math.max(currentVersion, migrations.length),
    });
  }
}
