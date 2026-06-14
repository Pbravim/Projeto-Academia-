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
  db.pragma('foreign_keys = OFF');

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
      carga_kg REAL,
      repeticoes INTEGER,
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

    // v5-v12: columns added in production migrations that the SQL repos require
    `ALTER TABLE exercises ADD COLUMN media_online TEXT;
     ALTER TABLE exercises ADD COLUMN media_local TEXT;
     ALTER TABLE exercises ADD COLUMN musculo_alvo TEXT;
     ALTER TABLE sessao_exercicios ADD COLUMN tempo_descanso_segundos INTEGER;
     ALTER TABLE sessao_exercicios ADD COLUMN substituido_por_exercicio_id TEXT;
     ALTER TABLE sessao_exercicios ADD COLUMN substituicao_motivo TEXT;
     ALTER TABLE sessao_exercicios ADD COLUMN musculo_alvo_snapshot TEXT;
     ALTER TABLE sessao_exercicios ADD COLUMN nome_original_snapshot TEXT;
     ALTER TABLE sessao_exercicios ADD COLUMN metodo TEXT NOT NULL DEFAULT 'normal';
     ALTER TABLE sessao_exercicios ADD COLUMN grupo_id TEXT;
     ALTER TABLE treino_exercicios ADD COLUMN tempo_descanso_segundos INTEGER;
     ALTER TABLE treino_exercicios ADD COLUMN metodo TEXT NOT NULL DEFAULT 'normal';
     ALTER TABLE treino_exercicios ADD COLUMN grupo_id TEXT;`,

    // v16 (test): exercise_alternatives, settings tables + sync metadata columns
    `CREATE TABLE IF NOT EXISTS exercise_alternatives (
   exercicio_id   TEXT NOT NULL,
   alternativa_id TEXT NOT NULL,
   PRIMARY KEY (exercicio_id, alternativa_id)
 );
 CREATE TABLE IF NOT EXISTS settings (
   key TEXT PRIMARY KEY NOT NULL,
   value TEXT NOT NULL
 );
 ALTER TABLE exercises          ADD COLUMN deleted_at TEXT;
 ALTER TABLE exercises          ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
 ALTER TABLE exercises          ADD COLUMN server_rev INTEGER;
 ALTER TABLE treinos            ADD COLUMN deleted_at TEXT;
 ALTER TABLE treinos            ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
 ALTER TABLE treinos            ADD COLUMN server_rev INTEGER;
 ALTER TABLE treino_exercicios  ADD COLUMN updated_at TEXT;
 ALTER TABLE treino_exercicios  ADD COLUMN deleted_at TEXT;
 ALTER TABLE treino_exercicios  ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
 ALTER TABLE treino_exercicios  ADD COLUMN server_rev INTEGER;
 ALTER TABLE sessao_treinos     ADD COLUMN updated_at TEXT;
 ALTER TABLE sessao_treinos     ADD COLUMN deleted_at TEXT;
 ALTER TABLE sessao_treinos     ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
 ALTER TABLE sessao_treinos     ADD COLUMN server_rev INTEGER;
 ALTER TABLE sessao_exercicios  ADD COLUMN updated_at TEXT;
 ALTER TABLE sessao_exercicios  ADD COLUMN deleted_at TEXT;
 ALTER TABLE sessao_exercicios  ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
 ALTER TABLE sessao_exercicios  ADD COLUMN server_rev INTEGER;
 ALTER TABLE series_registradas ADD COLUMN updated_at TEXT;
 ALTER TABLE series_registradas ADD COLUMN deleted_at TEXT;
 ALTER TABLE series_registradas ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
 ALTER TABLE series_registradas ADD COLUMN server_rev INTEGER;
 ALTER TABLE registros_peso     ADD COLUMN updated_at TEXT;
 ALTER TABLE registros_peso     ADD COLUMN deleted_at TEXT;
 ALTER TABLE registros_peso     ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
 ALTER TABLE registros_peso     ADD COLUMN server_rev INTEGER;
 ALTER TABLE exercise_alternatives ADD COLUMN updated_at TEXT;
 ALTER TABLE exercise_alternatives ADD COLUMN deleted_at TEXT;
 ALTER TABLE exercise_alternatives ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
 ALTER TABLE exercise_alternatives ADD COLUMN server_rev INTEGER;
 ALTER TABLE settings           ADD COLUMN updated_at TEXT;
 ALTER TABLE settings           ADD COLUMN deleted_at TEXT;
 ALTER TABLE settings           ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
 ALTER TABLE settings           ADD COLUMN server_rev INTEGER;`,

    // v20: exercise intelligence columns + typed alternative tables
    `ALTER TABLE exercises ADD COLUMN movement_pattern TEXT;
     ALTER TABLE exercises ADD COLUMN stabilizers TEXT;
     ALTER TABLE exercises ADD COLUMN execution_type TEXT;
     ALTER TABLE exercises ADD COLUMN name_variations TEXT;
     ALTER TABLE exercises ADD COLUMN primary_equipment TEXT;
     ALTER TABLE exercises ADD COLUMN secondary_equipment TEXT;
     ALTER TABLE exercises ADD COLUMN catalog_version INTEGER NOT NULL DEFAULT 0;
     CREATE TABLE IF NOT EXISTS exercise_equivalent_alternatives (
       exercicio_id   TEXT NOT NULL,
       alternativa_id TEXT NOT NULL,
       PRIMARY KEY (exercicio_id, alternativa_id)
     );
     CREATE TABLE IF NOT EXISTS exercise_muscle_group_alternatives (
       exercicio_id   TEXT NOT NULL,
       alternativa_id TEXT NOT NULL,
       PRIMARY KEY (exercicio_id, alternativa_id)
     );`,

    // v21: movement_pattern_snapshot in sessao_exercicios
    `ALTER TABLE sessao_exercicios ADD COLUMN movement_pattern_snapshot TEXT;`,

    // v22: non-strength logging — tracking_type + nullable metrics (mirrors prod migration)
    `ALTER TABLE exercises ADD COLUMN tracking_type TEXT;
     UPDATE exercises SET tracking_type = 'reps_load' WHERE tracking_type IS NULL;
     ALTER TABLE series_registradas ADD COLUMN duracao_segundos INTEGER;
     ALTER TABLE series_registradas ADD COLUMN distancia_metros REAL;
     ALTER TABLE series_registradas ADD COLUMN intensidade REAL;
     ALTER TABLE sessao_exercicios ADD COLUMN tracking_type_snapshot TEXT;
     ALTER TABLE sessao_exercicios ADD COLUMN duracao_recomendada_segundos INTEGER;
     ALTER TABLE sessao_exercicios ADD COLUMN distancia_recomendada_metros REAL;
     ALTER TABLE sessao_exercicios ADD COLUMN intensidade_recomendada REAL;
     UPDATE sessao_exercicios SET tracking_type_snapshot = 'reps_load' WHERE tracking_type_snapshot IS NULL;
     ALTER TABLE treino_exercicios ADD COLUMN duracao_recomendada_segundos INTEGER;
     ALTER TABLE treino_exercicios ADD COLUMN distancia_recomendada_metros REAL;
     ALTER TABLE treino_exercicios ADD COLUMN intensidade_recomendada REAL;`,
  ];

  for (const migration of migrations) {
    try {
      db.exec(migration);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('duplicate')) {
        throw error;
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
