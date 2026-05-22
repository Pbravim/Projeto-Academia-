import Database from 'better-sqlite3';
import type { SQLiteDatabaseClient, SQLiteBindParams } from '../infrastructure/persistence/sqlite/SQLiteDatabaseClient';

/**
 * Creates an in-memory SQLite database suitable for testing.
 * Includes all migrations from ExpoSQLiteDatabaseClient.
 */
export function createTestDatabase(): SQLiteDatabaseClient {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  // Run all migrations
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

    // v2: colunas de recomendacao em treino_exercicios
    `ALTER TABLE treino_exercicios ADD COLUMN series_recomendadas INTEGER;
     ALTER TABLE treino_exercicios ADD COLUMN execucoes_recomendadas INTEGER;`,

    // v3: carga padrao em treino_exercicios; series/execucoes/carga em sessao_exercicios
    `ALTER TABLE treino_exercicios ADD COLUMN carga_padrao REAL;
     ALTER TABLE sessao_exercicios ADD COLUMN series_recomendadas INTEGER;
     ALTER TABLE sessao_exercicios ADD COLUMN execucoes_recomendadas INTEGER;
     ALTER TABLE sessao_exercicios ADD COLUMN carga_padrao REAL;`,

    // v4: exercicios basicos pre-cadastrados
    `INSERT OR IGNORE INTO exercises (id, name, normalized_name, group_muscle, category, equipment, load_unit, is_custom, created_at, updated_at) VALUES
    ('seed-ex-001', 'Supino Reto com Barra',         'supino reto com barra',         'Peito, Triceps, Ombros',         'Composto',  'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
    ('seed-ex-002', 'Supino Inclinado com Barra',     'supino inclinado com barra',    'Peito, Ombros, Triceps',         'Composto',  'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
    ('seed-ex-003', 'Supino Declinado com Barra',     'supino declinado com barra',    'Peito, Triceps',                 'Composto',  'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');`,
  ];

  for (const migration of migrations) {
    try {
      db.exec(migration);
    } catch (error) {
      // Some migrations may fail due to ALTER TABLE on non-existent columns
      // This is expected behavior (idempotent migrations)
      if (!(error instanceof Error) || !error.message.includes('duplicate column')) {
        // Only ignore duplicate column errors; re-throw other errors
        if (!(error instanceof Error) || !error.message.includes('duplicate')) {
          throw error;
        }
      }
    }
  }

  // Wrap better-sqlite3 in our SQLiteDatabaseClient interface
  return new BetterSQLiteAdapter(db);
}

class BetterSQLiteAdapter implements SQLiteDatabaseClient {
  constructor(private readonly db: Database.Database) {}

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
