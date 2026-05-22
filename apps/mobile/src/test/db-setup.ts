import * as sqlite3 from "better-sqlite3"
import type { SQLiteDatabaseClient, SQLiteBindParams } from "../infrastructure/persistence/sqlite/SQLiteDatabaseClient";

const Database = sqlite3.default;

export function createTestDatabase(): SQLiteDatabaseClient {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  const migrations = [
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
    `ALTER TABLE treino_exercicios ADD COLUMN series_recomendadas INTEGER;
     ALTER TABLE treino_exercicios ADD COLUMN execucoes_recomendadas INTEGER;`,
    `ALTER TABLE treino_exercicios ADD COLUMN carga_padrao REAL;
     ALTER TABLE sessao_exercicios ADD COLUMN series_recomendadas INTEGER;
     ALTER TABLE sessao_exercicios ADD COLUMN execucoes_recomendadas INTEGER;
     ALTER TABLE sessao_exercicios ADD COLUMN carga_padrao REAL;`,
  ];

  for (const migration of migrations) {
    try {
      db.exec(migration);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("duplicate")) {
        throw error;
      }
    }
  }

  return new BetterSQLiteAdapter(db);
}

class BetterSQLiteAdapter implements SQLiteDatabaseClient {
  constructor(private readonly db: any) {}

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

  async getFirst<T>(statement: string, params?: SQLiteBindParams): Promise<T | null> {
    const stmt = this.db.prepare(statement);
    const result = params ? stmt.get(...params) : stmt.get();
    return result || null;
  }

  async getAll<T>(statement: string, params?: SQLiteBindParams): Promise<T[]> {
    const stmt = this.db.prepare(statement);
    const results = params ? stmt.all(...params) : stmt.all();
    return results as T[];
  }

  async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
    const transaction = this.db.transaction(() => fn());
    return transaction();
  }
}
