import * as SQLite from 'expo-sqlite';

import type { AppLogger } from '../../logging/AppLogger';
import type { DatabaseExportPort } from '../../../domain/dashboard/ports/DatabaseExportPort';
import type { TransactionPort } from '../../../domain/shared/ports/TransactionPort';
import type { SQLiteBindParams, SQLiteDatabaseClient } from './SQLiteDatabaseClient';
import { migrations, splitSqlStatements } from './migrations';


export class ExpoSQLiteDatabaseClient implements SQLiteDatabaseClient, DatabaseExportPort, TransactionPort {
  private databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
  private migrationPromise: Promise<void> | null = null;
  private _txDepth = 0;

  constructor(
    private readonly databaseName: string,
    private readonly logger: AppLogger
  ) {}

  get databaseFileName(): string {
    return this.databaseName;
  }

  /** Maior PRAGMA user_version que este build conhece (última migração aplicável). */
  get supportedSchemaVersion(): number {
    return migrations.length;
  }

  async close(): Promise<void> {
    if (!this.databasePromise) return;
    try {
      const database = await this.databasePromise;
      await database.closeAsync();
    } catch (error) {
      this.logger.error('database.close_failed', error);
    } finally {
      this.databasePromise = null;
      this.migrationPromise = null;
    }
  }

  async checkpointWal(): Promise<void> {
    if (!this.databasePromise) return;
    const database = await this.getReadyDatabase();
    await database.execAsync('PRAGMA wal_checkpoint(FULL);');
  }

  async exec(statement: string): Promise<void> {
    const database = await this.getReadyDatabase();
    await database.execAsync(statement);
  }

  async run(statement: string, params: SQLiteBindParams = []): Promise<void> {
    const database = await this.getReadyDatabase();
    await database.runAsync(statement, params);
  }

  async runWithChanges(statement: string, params: SQLiteBindParams = []): Promise<number> {
    const database = await this.getReadyDatabase();
    const result = await database.runAsync(statement, params);
    return result.changes;
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

  async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
    const depth = this._txDepth;
    if (depth === 0) {
      await this.run('BEGIN');
    } else {
      await this.run(`SAVEPOINT sp${depth}`);
    }
    this._txDepth++;
    try {
      const result = await fn();
      this._txDepth--;
      if (this._txDepth === 0) {
        await this.run('COMMIT');
      } else {
        await this.run(`RELEASE SAVEPOINT sp${depth}`);
      }
      return result;
    } catch (err) {
      this._txDepth--;
      if (this._txDepth === 0) {
        await this.run('ROLLBACK');
      } else {
        await this.run(`ROLLBACK TO SAVEPOINT sp${depth}`);
      }
      throw err;
    }
  }

  async getSetting(key: string): Promise<string | null> {
    const row = await this.getFirst<{ value: string }>('SELECT value FROM settings WHERE key = ? LIMIT 1', [key]);
    return row?.value ?? null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
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
    await database.execAsync('PRAGMA foreign_keys = ON;');

    const versionRow = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const currentVersion = versionRow?.user_version ?? 0;

    for (let i = currentVersion; i < migrations.length; i++) {
      // Step + bump do user_version em UMA transação: um crash no meio de um
      // rebuild (ex.: entre DROP e RENAME da v22) deixava o banco irreparável
      // no boot seguinte. Com rollback, o step inteiro é re-tentável.
      await database.execAsync('BEGIN IMMEDIATE');
      try {
        await this.runMigrationStep(database, migrations[i]);
        await database.execAsync(`PRAGMA user_version = ${i + 1}`);
        await database.execAsync('COMMIT');
      } catch (err) {
        await database.execAsync('ROLLBACK').catch(() => undefined);
        throw err;
      }
      this.logger.info('database.migration_applied', { version: i + 1 });
    }

    // Always verify critical columns exist — guards against any migration history on old devices.
    await this.ensureColumns(database);

    this.logger.info('database.ready', {
      databaseName: this.databaseName,
      version: Math.max(currentVersion, migrations.length),
    });
  }

  private async runMigrationStep(database: SQLite.SQLiteDatabase, migration: string): Promise<void> {
    const statements = splitSqlStatements(migration);

    for (const stmt of statements) {
      try {
        await database.execAsync(stmt + ';');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/duplicate column name/i.test(msg)) {
          this.logger.info('database.migration_column_exists', { hint: stmt.slice(0, 80) });
        } else {
          throw err;
        }
      }
    }
  }

  private async ensureColumns(database: SQLite.SQLiteDatabase): Promise<void> {
    const required: { table: string; column: string; type: string; defaultValue?: string }[] = [
      { table: 'treino_exercicios', column: 'series_recomendadas',       type: 'INTEGER' },
      { table: 'treino_exercicios', column: 'execucoes_recomendadas',    type: 'INTEGER' },
      { table: 'treino_exercicios', column: 'carga_padrao',              type: 'REAL'    },
      { table: 'treino_exercicios', column: 'tempo_descanso_segundos',   type: 'INTEGER' },
      { table: 'treino_exercicios', column: 'metodo',                   type: 'TEXT',   defaultValue: "'normal'" },
      { table: 'treino_exercicios', column: 'grupo_id',                 type: 'TEXT'    },
      { table: 'sessao_exercicios', column: 'series_recomendadas',       type: 'INTEGER' },
      { table: 'sessao_exercicios', column: 'execucoes_recomendadas',    type: 'INTEGER' },
      { table: 'sessao_exercicios', column: 'carga_padrao',              type: 'REAL'    },
      { table: 'sessao_exercicios', column: 'tempo_descanso_segundos',      type: 'INTEGER' },
      { table: 'sessao_exercicios', column: 'metodo',                      type: 'TEXT',   defaultValue: "'normal'" },
      { table: 'sessao_exercicios', column: 'grupo_id',                    type: 'TEXT'    },
      { table: 'exercises',         column: 'musculo_alvo',                type: 'TEXT'    },
      { table: 'sessao_exercicios', column: 'substituido_por_exercicio_id', type: 'TEXT'    },
      { table: 'sessao_exercicios', column: 'substituicao_motivo',          type: 'TEXT'    },
      { table: 'sessao_exercicios', column: 'musculo_alvo_snapshot',        type: 'TEXT'    },
      { table: 'sessao_exercicios', column: 'nome_original_snapshot',       type: 'TEXT'    },
      { table: 'exercises',           column: 'deleted_at', type: 'TEXT'    },
      { table: 'exercises',           column: 'dirty',      type: 'INTEGER', defaultValue: '1' },
      { table: 'exercises',           column: 'server_rev', type: 'INTEGER' },
      { table: 'treinos',             column: 'deleted_at', type: 'TEXT'    },
      { table: 'treinos',             column: 'dirty',      type: 'INTEGER', defaultValue: '1' },
      { table: 'treinos',             column: 'server_rev', type: 'INTEGER' },
      { table: 'treino_exercicios',   column: 'updated_at', type: 'TEXT'    },
      { table: 'treino_exercicios',   column: 'deleted_at', type: 'TEXT'    },
      { table: 'treino_exercicios',   column: 'dirty',      type: 'INTEGER', defaultValue: '1' },
      { table: 'treino_exercicios',   column: 'server_rev', type: 'INTEGER' },
      { table: 'sessao_treinos',      column: 'updated_at', type: 'TEXT'    },
      { table: 'sessao_treinos',      column: 'deleted_at', type: 'TEXT'    },
      { table: 'sessao_treinos',      column: 'dirty',      type: 'INTEGER', defaultValue: '1' },
      { table: 'sessao_treinos',      column: 'server_rev', type: 'INTEGER' },
      { table: 'sessao_exercicios',   column: 'updated_at', type: 'TEXT'    },
      { table: 'sessao_exercicios',   column: 'deleted_at', type: 'TEXT'    },
      { table: 'sessao_exercicios',   column: 'dirty',      type: 'INTEGER', defaultValue: '1' },
      { table: 'sessao_exercicios',   column: 'server_rev', type: 'INTEGER' },
      { table: 'series_registradas',  column: 'updated_at', type: 'TEXT'    },
      { table: 'series_registradas',  column: 'deleted_at', type: 'TEXT'    },
      { table: 'series_registradas',  column: 'dirty',      type: 'INTEGER', defaultValue: '1' },
      { table: 'series_registradas',  column: 'server_rev', type: 'INTEGER' },
      { table: 'registros_peso',      column: 'updated_at', type: 'TEXT'    },
      { table: 'registros_peso',      column: 'deleted_at', type: 'TEXT'    },
      { table: 'registros_peso',      column: 'dirty',      type: 'INTEGER', defaultValue: '1' },
      { table: 'registros_peso',      column: 'server_rev', type: 'INTEGER' },
    ];

    // Group columns by table to minimize PRAGMA queries
    const byTable = new Map<string, { column: string; type: string; defaultValue?: string }[]>();
    for (const col of required) {
      const list = byTable.get(col.table) ?? [];
      list.push({ column: col.column, type: col.type, defaultValue: col.defaultValue });
      byTable.set(col.table, list);
    }

    for (const [table, cols] of byTable) {
      const info = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
      const existing = new Set(info.map((c) => c.name));
      for (const { column, type, defaultValue } of cols) {
        if (!existing.has(column)) {
          const def = defaultValue ? ` NOT NULL DEFAULT ${defaultValue}` : '';
          await database.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}${def};`);
          this.logger.info('database.column_added', { table, column });
        }
      }
    }
  }
}
