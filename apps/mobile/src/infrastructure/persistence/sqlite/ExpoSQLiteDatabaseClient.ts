import * as SQLite from 'expo-sqlite';

import type { AppLogger } from '../../logging/AppLogger';
import type { DatabaseExportPort } from '../../../domain/dashboard/ports/DatabaseExportPort';
import type { TransactionPort } from '../../../domain/shared/ports/TransactionPort';
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
  );
  CREATE INDEX IF NOT EXISTS idx_sessao_treinos_treino_id
    ON sessao_treinos (treino_id);
  CREATE INDEX IF NOT EXISTS idx_sessao_exercicios_sessao_treino_id
    ON sessao_exercicios (sessao_treino_id);
  CREATE INDEX IF NOT EXISTS idx_sessao_exercicios_exercicio_id
    ON sessao_exercicios (exercicio_id);
  CREATE INDEX IF NOT EXISTS idx_series_sessao_exercicio
    ON series_registradas (sessao_exercicio_id);
  CREATE INDEX IF NOT EXISTS idx_peso_data
    ON registros_peso (data_registro);
  `,

  // v2: colunas de recomendacao em treino_exercicios
  `ALTER TABLE treino_exercicios ADD COLUMN series_recomendadas INTEGER;
   ALTER TABLE treino_exercicios ADD COLUMN execucoes_recomendadas INTEGER;`,

  // v3: carga padrao em treino_exercicios; series/execucoes/carga em sessao_exercicios
  `ALTER TABLE treino_exercicios ADD COLUMN carga_padrao REAL;
   ALTER TABLE sessao_exercicios ADD COLUMN series_recomendadas INTEGER;
   ALTER TABLE sessao_exercicios ADD COLUMN execucoes_recomendadas INTEGER;
   ALTER TABLE sessao_exercicios ADD COLUMN carga_padrao REAL;`,

  // v4: exercicios basicos pre-cadastrados (INSERT OR IGNORE — nao sobrescreve dados do usuario)
  `INSERT OR IGNORE INTO exercises (id, name, normalized_name, group_muscle, category, equipment, load_unit, is_custom, created_at, updated_at) VALUES
  ('seed-ex-001', 'Supino Reto com Barra',         'supino reto com barra',         'Peito, Triceps, Ombros',         'Composto',  'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-002', 'Supino Inclinado com Barra',     'supino inclinado com barra',    'Peito, Ombros, Triceps',         'Composto',  'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-003', 'Supino Declinado com Barra',     'supino declinado com barra',    'Peito, Triceps',                 'Composto',  'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-004', 'Supino Reto com Haltere',        'supino reto com haltere',       'Peito, Triceps',                 'Composto',  'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-005', 'Crucifixo com Haltere',          'crucifixo com haltere',         'Peito',                          'Isolado',   'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-006', 'Crossover no Cabo',              'crossover no cabo',             'Peito',                          'Isolado',   'Cabo',           'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-007', 'Flexao de Braco',                'flexao de braco',               'Peito, Triceps, Ombros',         'Composto',  'Peso corporal',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-009', 'Barra Fixa',                     'barra fixa',                    'Costas, Biceps',                 'Composto',  'Peso corporal',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-010', 'Puxada Frontal',                 'puxada frontal',                'Costas, Biceps',                 'Composto',  'Cabo',           'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-011', 'Remada Curvada com Barra',       'remada curvada com barra',      'Costas, Biceps',                 'Composto',  'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-012', 'Remada Unilateral com Haltere',  'remada unilateral com haltere', 'Costas, Biceps',                 'Composto',  'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-013', 'Remada Baixa no Cabo',           'remada baixa no cabo',          'Costas, Biceps',                 'Composto',  'Cabo',           'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-014', 'Levantamento Terra',             'levantamento terra',            'Costas, Gluteos, Posterior',     'Composto',  'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-015', 'Desenvolvimento com Barra',      'desenvolvimento com barra',     'Ombros, Triceps',                'Composto',  'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-016', 'Desenvolvimento com Haltere',    'desenvolvimento com haltere',   'Ombros, Triceps',                'Composto',  'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-017', 'Elevacao Lateral com Haltere',   'elevacao lateral com haltere',  'Ombros',                         'Isolado',   'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-018', 'Elevacao Frontal com Haltere',   'elevacao frontal com haltere',  'Ombros',                         'Isolado',   'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-019', 'Elevacao Posterior com Haltere', 'elevacao posterior com haltere','Ombros, Trapezio',               'Isolado',   'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-020', 'Encolhimento com Haltere',       'encolhimento com haltere',      'Trapezio',                       'Isolado',   'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-021', 'Rosca Direta com Barra',         'rosca direta com barra',        'Biceps',                         'Isolado',   'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-022', 'Rosca Alternada com Haltere',    'rosca alternada com haltere',   'Biceps',                         'Isolado',   'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-023', 'Rosca Concentrada com Haltere',  'rosca concentrada com haltere', 'Biceps',                         'Isolado',   'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-024', 'Rosca no Cabo',                  'rosca no cabo',                 'Biceps',                         'Isolado',   'Cabo',           'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-025', 'Triceps Testa com Barra',        'triceps testa com barra',       'Triceps',                        'Isolado',   'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-026', 'Triceps Pulley',                 'triceps pulley',                'Triceps',                        'Isolado',   'Cabo',           'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-027', 'Triceps Coice com Haltere',      'triceps coice com haltere',     'Triceps',                        'Isolado',   'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-028', 'Triceps Frances com Haltere',    'triceps frances com haltere',   'Triceps',                        'Isolado',   'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-029', 'Mergulho entre Bancos',          'mergulho entre bancos',         'Triceps, Peito, Ombros',         'Composto',  'Peso corporal',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-030', 'Abdominal Crunch',               'abdominal crunch',              'Abdomen',                        'Isolado',   'Peso corporal',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-031', 'Prancha Abdominal',              'prancha abdominal',             'Abdomen',                        'Isolado',   'Peso corporal',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-032', 'Elevacao de Pernas',             'elevacao de pernas',            'Abdomen',                        'Isolado',   'Peso corporal',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-033', 'Abdominal Obliquo',              'abdominal obliquo',             'Abdomen',                        'Isolado',   'Peso corporal',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-034', 'Agachamento Livre',              'agachamento livre',             'Quadriceps, Gluteos, Posterior', 'Composto',  'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-035', 'Leg Press 45',                   'leg press 45',                  'Quadriceps, Gluteos',            'Composto',  'Maquina',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-036', 'Afundo com Haltere',             'afundo com haltere',            'Quadriceps, Gluteos',            'Composto',  'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-038', 'Leg Curl',                       'leg curl',                      'Posterior',                      'Isolado',   'Maquina',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-039', 'Stiff com Barra',                'stiff com barra',               'Posterior, Gluteos',             'Composto',  'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-040', 'Hip Thrust com Barra',           'hip thrust com barra',          'Gluteos, Posterior',             'Composto',  'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-042', 'Panturrilha em Pe',              'panturrilha em pe',             'Panturrilha',                    'Isolado',   'Maquina',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-043', 'Panturrilha Sentado',            'panturrilha sentado',           'Panturrilha',                    'Isolado',   'Maquina',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');`,

  // v5: safety-net for devices that skipped v3 carga_padrao migration (had old v3 = seeds)
  // The migration runner ignores "duplicate column name" so this is safe to run on any device.
  `ALTER TABLE treino_exercicios ADD COLUMN carga_padrao REAL;
   ALTER TABLE sessao_exercicios ADD COLUMN series_recomendadas INTEGER;
   ALTER TABLE sessao_exercicios ADD COLUMN execucoes_recomendadas INTEGER;
   ALTER TABLE sessao_exercicios ADD COLUMN carga_padrao REAL;`,

  // v6: tempo de descanso entre series configuravel por exercicio no treino
  `ALTER TABLE treino_exercicios ADD COLUMN tempo_descanso_segundos INTEGER;
   ALTER TABLE sessao_exercicios ADD COLUMN tempo_descanso_segundos INTEGER;`,

  // v7: tabela de configuracoes do app (chave-valor)
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );`,

  // v8: midia por exercicio — URL online e arquivo local (opcional)
  `ALTER TABLE exercises ADD COLUMN media_online TEXT;
   ALTER TABLE exercises ADD COLUMN media_local TEXT;`,

  // v9: substituição de exercícios durante sessão + musculo_alvo para matching de substitutos
  `ALTER TABLE exercises ADD COLUMN musculo_alvo TEXT;
   ALTER TABLE sessao_exercicios ADD COLUMN substituido_por_exercicio_id TEXT;
   ALTER TABLE sessao_exercicios ADD COLUMN substituicao_motivo TEXT;
   ALTER TABLE sessao_exercicios ADD COLUMN musculo_alvo_snapshot TEXT;
   ALTER TABLE sessao_exercicios ADD COLUMN nome_original_snapshot TEXT;
   CREATE TABLE IF NOT EXISTS exercise_alternatives (
     exercicio_id   TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
     alternativa_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
     PRIMARY KEY (exercicio_id, alternativa_id)
   );
   UPDATE exercises SET musculo_alvo = 'peitoral_medio'          WHERE id IN ('seed-ex-001','seed-ex-004','seed-ex-005','seed-ex-006','seed-ex-007');
   UPDATE exercises SET musculo_alvo = 'peitoral_superior'       WHERE id = 'seed-ex-002';
   UPDATE exercises SET musculo_alvo = 'peitoral_inferior'       WHERE id = 'seed-ex-003';
   UPDATE exercises SET musculo_alvo = 'dorsal'                  WHERE id IN ('seed-ex-009','seed-ex-010','seed-ex-014');
   UPDATE exercises SET musculo_alvo = 'romboides_trapezio_medio' WHERE id IN ('seed-ex-011','seed-ex-012','seed-ex-013');
   UPDATE exercises SET musculo_alvo = 'deltoide_anterior'       WHERE id IN ('seed-ex-015','seed-ex-016','seed-ex-018');
   UPDATE exercises SET musculo_alvo = 'deltoide_lateral'        WHERE id = 'seed-ex-017';
   UPDATE exercises SET musculo_alvo = 'deltoide_posterior'      WHERE id = 'seed-ex-019';
   UPDATE exercises SET musculo_alvo = 'trapezio'                WHERE id = 'seed-ex-020';
   UPDATE exercises SET musculo_alvo = 'biceps'                  WHERE id IN ('seed-ex-021','seed-ex-022','seed-ex-023','seed-ex-024');
   UPDATE exercises SET musculo_alvo = 'triceps_cabeca_longa'    WHERE id IN ('seed-ex-025','seed-ex-028');
   UPDATE exercises SET musculo_alvo = 'triceps_lateral_medial'  WHERE id IN ('seed-ex-026','seed-ex-027','seed-ex-029');
   UPDATE exercises SET musculo_alvo = 'abdomen'                 WHERE id IN ('seed-ex-030','seed-ex-031','seed-ex-032','seed-ex-033');
   UPDATE exercises SET musculo_alvo = 'quadriceps'              WHERE id IN ('seed-ex-034','seed-ex-035','seed-ex-036');
   UPDATE exercises SET musculo_alvo = 'isquiotibiais'           WHERE id IN ('seed-ex-038','seed-ex-039');
   UPDATE exercises SET musculo_alvo = 'gluteos'                 WHERE id = 'seed-ex-040';
   UPDATE exercises SET musculo_alvo = 'panturrilha'             WHERE id IN ('seed-ex-042','seed-ex-043');
   CREATE INDEX IF NOT EXISTS idx_exercises_musculo_alvo ON exercises (musculo_alvo);`,

  // v10: re-seed any exercises deleted before cascade-delete was introduced (pre-commit 3aaa4f2).
  // INSERT OR IGNORE is a no-op when the row already exists, so this is safe to run unconditionally.
  // The musculo_alvo UPDATEs are idempotent and cover any rows that missed the v9 pass.
  `INSERT OR IGNORE INTO exercises (id, name, normalized_name, group_muscle, category, equipment, load_unit, is_custom, created_at, updated_at) VALUES
  ('seed-ex-001', 'Supino Reto com Barra',         'supino reto com barra',         'Peito, Triceps, Ombros',         'Composto',  'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-002', 'Supino Inclinado com Barra',     'supino inclinado com barra',    'Peito, Ombros, Triceps',         'Composto',  'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-003', 'Supino Declinado com Barra',     'supino declinado com barra',    'Peito, Triceps',                 'Composto',  'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-004', 'Supino Reto com Haltere',        'supino reto com haltere',       'Peito, Triceps',                 'Composto',  'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-005', 'Crucifixo com Haltere',          'crucifixo com haltere',         'Peito',                          'Isolado',   'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-006', 'Crossover no Cabo',              'crossover no cabo',             'Peito',                          'Isolado',   'Cabo',           'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-007', 'Flexao de Braco',                'flexao de braco',               'Peito, Triceps, Ombros',         'Composto',  'Peso corporal',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-009', 'Barra Fixa',                     'barra fixa',                    'Costas, Biceps',                 'Composto',  'Peso corporal',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-010', 'Puxada Frontal',                 'puxada frontal',                'Costas, Biceps',                 'Composto',  'Cabo',           'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-011', 'Remada Curvada com Barra',       'remada curvada com barra',      'Costas, Biceps',                 'Composto',  'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-012', 'Remada Unilateral com Haltere',  'remada unilateral com haltere', 'Costas, Biceps',                 'Composto',  'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-013', 'Remada Baixa no Cabo',           'remada baixa no cabo',          'Costas, Biceps',                 'Composto',  'Cabo',           'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-014', 'Levantamento Terra',             'levantamento terra',            'Costas, Gluteos, Posterior',     'Composto',  'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-015', 'Desenvolvimento com Barra',      'desenvolvimento com barra',     'Ombros, Triceps',                'Composto',  'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-016', 'Desenvolvimento com Haltere',    'desenvolvimento com haltere',   'Ombros, Triceps',                'Composto',  'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-017', 'Elevacao Lateral com Haltere',   'elevacao lateral com haltere',  'Ombros',                         'Isolado',   'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-018', 'Elevacao Frontal com Haltere',   'elevacao frontal com haltere',  'Ombros',                         'Isolado',   'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-019', 'Elevacao Posterior com Haltere', 'elevacao posterior com haltere','Ombros, Trapezio',               'Isolado',   'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-020', 'Encolhimento com Haltere',       'encolhimento com haltere',      'Trapezio',                       'Isolado',   'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-021', 'Rosca Direta com Barra',         'rosca direta com barra',        'Biceps',                         'Isolado',   'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-022', 'Rosca Alternada com Haltere',    'rosca alternada com haltere',   'Biceps',                         'Isolado',   'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-023', 'Rosca Concentrada com Haltere',  'rosca concentrada com haltere', 'Biceps',                         'Isolado',   'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-024', 'Rosca no Cabo',                  'rosca no cabo',                 'Biceps',                         'Isolado',   'Cabo',           'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-025', 'Triceps Testa com Barra',        'triceps testa com barra',       'Triceps',                        'Isolado',   'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-026', 'Triceps Pulley',                 'triceps pulley',                'Triceps',                        'Isolado',   'Cabo',           'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-027', 'Triceps Coice com Haltere',      'triceps coice com haltere',     'Triceps',                        'Isolado',   'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-028', 'Triceps Frances com Haltere',    'triceps frances com haltere',   'Triceps',                        'Isolado',   'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-029', 'Mergulho entre Bancos',          'mergulho entre bancos',         'Triceps, Peito, Ombros',         'Composto',  'Peso corporal',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-030', 'Abdominal Crunch',               'abdominal crunch',              'Abdomen',                        'Isolado',   'Peso corporal',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-031', 'Prancha Abdominal',              'prancha abdominal',             'Abdomen',                        'Isolado',   'Peso corporal',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-032', 'Elevacao de Pernas',             'elevacao de pernas',            'Abdomen',                        'Isolado',   'Peso corporal',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-033', 'Abdominal Obliquo',              'abdominal obliquo',             'Abdomen',                        'Isolado',   'Peso corporal',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-034', 'Agachamento Livre',              'agachamento livre',             'Quadriceps, Gluteos, Posterior', 'Composto',  'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-035', 'Leg Press 45',                   'leg press 45',                  'Quadriceps, Gluteos',            'Composto',  'Maquina',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-036', 'Afundo com Haltere',             'afundo com haltere',            'Quadriceps, Gluteos',            'Composto',  'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-038', 'Leg Curl',                       'leg curl',                      'Posterior',                      'Isolado',   'Maquina',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-039', 'Stiff com Barra',                'stiff com barra',               'Posterior, Gluteos',             'Composto',  'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-040', 'Hip Thrust com Barra',           'hip thrust com barra',          'Gluteos, Posterior',             'Composto',  'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-042', 'Panturrilha em Pe',              'panturrilha em pe',             'Panturrilha',                    'Isolado',   'Maquina',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-043', 'Panturrilha Sentado',            'panturrilha sentado',           'Panturrilha',                    'Isolado',   'Maquina',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');
  UPDATE exercises SET musculo_alvo = 'peitoral_medio'          WHERE id IN ('seed-ex-001','seed-ex-004','seed-ex-005','seed-ex-006','seed-ex-007') AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'peitoral_superior'       WHERE id = 'seed-ex-002' AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'peitoral_inferior'       WHERE id = 'seed-ex-003' AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'dorsal'                  WHERE id IN ('seed-ex-009','seed-ex-010','seed-ex-014') AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'romboides_trapezio_medio' WHERE id IN ('seed-ex-011','seed-ex-012','seed-ex-013') AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'deltoide_anterior'       WHERE id IN ('seed-ex-015','seed-ex-016','seed-ex-018') AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'deltoide_lateral'        WHERE id = 'seed-ex-017' AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'deltoide_posterior'      WHERE id = 'seed-ex-019' AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'trapezio'                WHERE id = 'seed-ex-020' AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'biceps'                  WHERE id IN ('seed-ex-021','seed-ex-022','seed-ex-023','seed-ex-024') AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'triceps_cabeca_longa'    WHERE id IN ('seed-ex-025','seed-ex-028') AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'triceps_lateral_medial'  WHERE id IN ('seed-ex-026','seed-ex-027','seed-ex-029') AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'abdomen'                 WHERE id IN ('seed-ex-030','seed-ex-031','seed-ex-032','seed-ex-033') AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'quadriceps'              WHERE id IN ('seed-ex-034','seed-ex-035','seed-ex-036') AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'isquiotibiais'           WHERE id IN ('seed-ex-038','seed-ex-039') AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'gluteos'                 WHERE id = 'seed-ex-040' AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'panturrilha'             WHERE id IN ('seed-ex-042','seed-ex-043') AND musculo_alvo IS NULL`,

  // v11: sessões podem ser arquivadas (soft-delete) — ocultas da evolução mas não apagadas
  `ALTER TABLE sessao_treinos ADD COLUMN arquivado INTEGER NOT NULL DEFAULT 0;
   CREATE INDEX IF NOT EXISTS idx_sessao_treinos_status_data ON sessao_treinos (status, arquivado, data_hora_inicio);`,

  // v12: método de execução e agrupamento por grupo (bi-set, circuito, drop-set)
  `ALTER TABLE treino_exercicios ADD COLUMN metodo TEXT NOT NULL DEFAULT 'normal';
   ALTER TABLE treino_exercicios ADD COLUMN grupo_id TEXT;
   ALTER TABLE sessao_exercicios ADD COLUMN metodo TEXT NOT NULL DEFAULT 'normal';
   ALTER TABLE sessao_exercicios ADD COLUMN grupo_id TEXT;`,

  // v13: exercicios com GIF pre-cadastrados
  `INSERT OR IGNORE INTO exercises (id, name, normalized_name, group_muscle, category, equipment, load_unit, is_custom, created_at, updated_at, media_local, musculo_alvo) VALUES
  ('gif-ex-001', 'Supino Reto Pes Elevados',                        'supino reto pes elevados',                          'Peito, Triceps, Ombros',      'Composto',  'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PEITORAL (1)/bench-press-feet-up.gif',                                                     'peitoral_medio'),
  ('gif-ex-002', 'Supino Reto Unilateral com Halteres',             'supino reto unilateral com halteres',               'Peito, Triceps',              'Composto',  'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PEITORAL (1)/dumbbell-one-arm-chest-press.gif',                                            'peitoral_medio'),
  ('gif-ex-003', 'Supino Alternado com Halteres',                   'supino alternado com halteres',                     'Peito, Triceps',              'Composto',  'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PEITORAL (1)/SUPINO ALTERNADO COM HALTERES.gif',                                           'peitoral_medio'),
  ('gif-ex-004', 'Supino no Smith',                                 'supino no smith',                                   'Peito, Triceps, Ombros',      'Composto',  'Smith',           'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PEITORAL (1)/Supino smith.gif',                                                             'peitoral_medio'),
  ('gif-ex-005', 'Supino Inclinado com Halteres',                   'supino inclinado com halteres',                     'Peito, Ombros, Triceps',      'Composto',  'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PEITORAL (1)/Supino incliando com halteres.gif',                                           'peitoral_superior'),
  ('gif-ex-006', 'Supino Inclinado no Smith',                       'supino inclinado no smith',                         'Peito, Ombros, Triceps',      'Composto',  'Smith',           'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PEITORAL (1)/INCLINADO NO SMITH.gif',                                                      'peitoral_superior'),
  ('gif-ex-007', 'Supino Inclinado com Barra Variacao',             'supino inclinado com barra variacao',               'Peito, Ombros, Triceps',      'Composto',  'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PEITORAL (1)/incline-barbell-bench-press.gif',                                             'peitoral_superior'),
  ('gif-ex-008', 'Supino Declinado no Smith',                       'supino declinado no smith',                         'Peito, Triceps',              'Composto',  'Smith',           'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PEITORAL (1)/Declinado smith.gif',                                                          'peitoral_inferior'),
  ('gif-ex-009', 'Crucifixo Inclinado com Halteres',                'crucifixo inclinado com halteres',                  'Peito',                       'Isolado',   'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PEITORAL (1)/Crucifixo inclinado com halteres.gif',                                        'peitoral_superior'),
  ('gif-ex-010', 'Crucifixo Inclinado no Cabo',                     'crucifixo inclinado no cabo',                       'Peito',                       'Isolado',   'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PEITORAL (1)/Crucifixo inclinado no cabo 2.gif',                                           'peitoral_superior'),
  ('gif-ex-011', 'Crucifixo Polia Baixa',                           'crucifixo polia baixa',                             'Peito',                       'Isolado',   'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PEITORAL (1)/CRUCIFIXO POLIA BAIXA.gif',                                                   'peitoral_medio'),
  ('gif-ex-012', 'Cross Over Polia Alta',                           'cross over polia alta',                             'Peito',                       'Isolado',   'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PEITORAL (1)/Cross over 1.gif',                                                             'peitoral_inferior'),
  ('gif-ex-013', 'Cross Over Polia Media',                          'cross over polia media',                            'Peito',                       'Isolado',   'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PEITORAL (1)/Cross over 2.gif',                                                             'peitoral_medio'),
  ('gif-ex-014', 'Cross Over Polia Baixa',                          'cross over polia baixa',                            'Peito',                       'Isolado',   'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PEITORAL (1)/Cross over polia baixa.gif',                                                   'peitoral_superior'),
  ('gif-ex-015', 'Crucifixo Cabo Alto',                             'crucifixo cabo alto',                               'Peito',                       'Isolado',   'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PEITORAL (1)/high-cable-fly.gif',                                                           'peitoral_inferior'),
  ('gif-ex-016', 'Crucifixo Cabo Baixo',                            'crucifixo cabo baixo',                              'Peito',                       'Isolado',   'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PEITORAL (1)/low-cable-chest-flys.gif',                                                     'peitoral_superior'),
  ('gif-ex-017', 'Crucifixo Declinado no Cabo',                     'crucifixo declinado no cabo',                       'Peito',                       'Isolado',   'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PEITORAL (1)/decline-cable-fly.gif',                                                        'peitoral_inferior'),
  ('gif-ex-018', 'Press Peitoral na Maquina',                       'press peitoral na maquina',                         'Peito, Triceps',              'Composto',  'Maquina',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PEITORAL (1)/chest-press-machine.gif',                                                      'peitoral_medio'),
  ('gif-ex-019', 'Press Peitoral Variacao',                         'press peitoral variacao',                           'Peito, Triceps',              'Composto',  'Maquina',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PEITORAL (1)/Press peitoral 3.gif',                                                         'peitoral_medio'),
  ('gif-ex-020', 'Press Inclinado no Cabo',                         'press inclinado no cabo',                           'Peito, Ombros, Triceps',      'Composto',  'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PEITORAL (1)/Press alto inclinado.gif',                                                     'peitoral_superior'),
  ('gif-ex-021', 'Peck Deck',                                       'peck deck',                                         'Peito',                       'Isolado',   'Maquina',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PEITORAL (1)/Peck deck.gif',                                                                'peitoral_medio'),
  ('gif-ex-022', 'Paralelas no Graviton Peito',                     'paralelas no graviton peito',                       'Peito, Triceps, Ombros',      'Composto',  'Graviton',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PEITORAL (1)/Paralelas graviton.gif',                                                       'peitoral_medio'),
  ('gif-ex-023', 'Flexao com Apoio Alto',                           'flexao com apoio alto',                             'Peito, Triceps, Ombros',      'Composto',  'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PEITORAL (1)/Flexao apoio alto banco.gif',                                                  'peitoral_medio'),
  ('gif-ex-024', 'Flexao Assistida',                                'flexao assistida',                                  'Peito, Triceps, Ombros',      'Composto',  'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PEITORAL (1)/Flexao assistida.gif',                                                         'peitoral_medio'),
  ('gif-ex-025', 'Flexao com Barras',                               'flexao com barras',                                 'Peito, Triceps, Ombros',      'Composto',  'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PEITORAL (1)/push-up-bars.gif',                                                             'peitoral_medio'),
  ('gif-ex-026', 'Pike Push-Up',                                    'pike push-up',                                      'Ombros, Peito, Triceps',      'Composto',  'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PEITORAL (1)/pike-push-up.gif',                                                             'deltoide_anterior'),
  ('gif-ex-027', 'Crucifixo Inclinado Banco com Halteres',          'crucifixo inclinado banco com halteres',            'Peito',                       'Isolado',   'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Peito/crucifixo inclinado banco com halteres.gif',                            'peitoral_superior'),
  ('gif-ex-028', 'Crucifixo Maquina',                               'crucifixo maquina',                                 'Peito',                       'Isolado',   'Maquina',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Peito/Crucifixo Maquina.gif',                                                  'peitoral_medio'),
  ('gif-ex-029', 'Pullover com Halteres Bonus',                     'pullover com halteres bonus',                       'Costas, Peito',               'Isolado',   'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Peito/Dumbbell covers com halteres.gif',                                       'dorsal'),
  ('gif-ex-030', 'Flexao Cotovelo Completa Peito',                  'flexao cotovelo completa peito',                    'Peito, Triceps, Ombros',      'Composto',  'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Peito/flex de cotovelo completa.gif',                                          'peitoral_medio'),
  ('gif-ex-031', 'Flexao Cotovelo Declinado',                       'flexao cotovelo declinado',                         'Peito, Triceps',              'Composto',  'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Peito/flex de cotovelo declinado.gif',                                         'peitoral_inferior'),
  ('gif-ex-032', 'Supino Inclinado no Cabo',                        'supino inclinado no cabo',                          'Peito, Ombros, Triceps',      'Composto',  'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Peito/supino inclinado banco cross.gif',                                       'peitoral_superior'),
  ('gif-ex-033', 'Supino Inclinado no Smith Bonus',                 'supino inclinado no smith bonus',                   'Peito, Ombros, Triceps',      'Composto',  'Smith',           'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Peito/supino inclinado banco no smith.gif',                                    'peitoral_superior'),
  ('gif-ex-034', 'Supino Reto Pegada Aberta',                       'supino reto pegada aberta',                         'Peito, Triceps, Ombros',      'Composto',  'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Peito/supino reto pegada aberta.gif',                                          'peitoral_medio'),
  ('gif-ex-035', 'Voador Maquina',                                  'voador maquina',                                    'Peito',                       'Isolado',   'Maquina',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Peito/voador maquina.gif',                                                     'peitoral_medio'),
  ('gif-ex-036', 'Barra Fixa Assistida com Elastico',               'barra fixa assistida com elastico',                 'Costas, Biceps',              'Composto',  'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'COSTAS E TRAPÉZIO (1)/band-assisted-pull-up.gif',                                           'dorsal'),
  ('gif-ex-037', 'Remada Aberta com Elastico',                      'remada aberta com elastico',                        'Costas, Biceps',              'Composto',  'Elastico',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'COSTAS E TRAPÉZIO (1)/banded-wide-grip-row.gif',                                            'romboides_trapezio_medio'),
  ('gif-ex-038', 'Barra Fixa na Nuca',                              'barra fixa na nuca',                                'Costas, Biceps',              'Composto',  'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'COSTAS E TRAPÉZIO (1)/Barra fixa nuca.gif',                                                 'dorsal'),
  ('gif-ex-039', 'Puxada Alta Tradicional',                         'puxada alta tradicional',                           'Costas, Biceps',              'Composto',  'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'COSTAS E TRAPÉZIO (1)/Puxada alta tradicional.gif',                                         'dorsal'),
  ('gif-ex-040', 'Puxada Alta com Triangulo',                       'puxada alta com triangulo',                         'Costas, Biceps',              'Composto',  'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'COSTAS E TRAPÉZIO (1)/Puxada alta triangulo.gif',                                           'dorsal'),
  ('gif-ex-041', 'Puxada Unilateral no Cabo',                       'puxada unilateral no cabo',                         'Costas, Biceps',              'Composto',  'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'COSTAS E TRAPÉZIO (1)/Puxada unilateral 1.gif',                                             'dorsal'),
  ('gif-ex-042', 'Remada com Halteres',                             'remada com halteres',                               'Costas, Biceps',              'Composto',  'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'COSTAS E TRAPÉZIO (1)/Remada com halteres.gif',                                             'romboides_trapezio_medio'),
  ('gif-ex-043', 'Remada no Banco Inclinado',                       'remada no banco inclinado',                         'Costas, Biceps',              'Composto',  'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'COSTAS E TRAPÉZIO (1)/Remada apoio banco inclinado.gif',                                    'romboides_trapezio_medio'),
  ('gif-ex-044', 'Remada na Maquina',                               'remada na maquina',                                 'Costas, Biceps',              'Composto',  'Maquina',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'COSTAS E TRAPÉZIO (1)/Remada maquina.gif',                                                  'romboides_trapezio_medio'),
  ('gif-ex-045', 'Remada Unilateral com Haltere Variacao',          'remada unilateral com haltere variacao',            'Costas, Biceps',              'Composto',  'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'COSTAS E TRAPÉZIO (1)/single-arm-dumbbell-row.gif',                                         'romboides_trapezio_medio'),
  ('gif-ex-046', 'Remada Cavalinho T-Bar Row',                      'remada cavalinho t-bar row',                        'Costas, Biceps',              'Composto',  'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'COSTAS E TRAPÉZIO (1)/t-bar-row-muscles.gif',                                               'romboides_trapezio_medio'),
  ('gif-ex-047', 'Remada no Cabo Pegada Aberta',                    'remada no cabo pegada aberta',                      'Costas, Biceps',              'Composto',  'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'COSTAS E TRAPÉZIO (1)/cable-wide-grip-row.gif',                                             'romboides_trapezio_medio'),
  ('gif-ex-048', 'Face Pull no Cabo',                               'face pull no cabo',                                 'Ombros, Trapezio',            'Isolado',   'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'COSTAS E TRAPÉZIO (1)/cable-face-pull.gif',                                                 'deltoide_posterior'),
  ('gif-ex-049', 'Barra Fixa Pegada Aberta',                        'barra fixa pegada aberta',                          'Costas, Biceps',              'Composto',  'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Costas/Barra Livre pegada aberta.gif',                                         'dorsal'),
  ('gif-ex-050', 'Barra Fixa Joelhos Flexionados',                  'barra fixa joelhos flexionados',                    'Costas, Biceps',              'Composto',  'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Costas/barra livre pegada aberta joelhos flexionados.gif',                     'dorsal'),
  ('gif-ex-051', 'Barra Fixa Pegada Pronada',                       'barra fixa pegada pronada',                         'Costas, Biceps',              'Composto',  'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Costas/barra livre pegada pronada.gif',                                        'dorsal'),
  ('gif-ex-052', 'Barra no Graviton em Pe',                         'barra no graviton em pe',                           'Costas, Biceps',              'Composto',  'Graviton',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Costas/barra no graviton em pe.gif',                                           'dorsal'),
  ('gif-ex-053', 'Hiperextensao no Banco',                          'hiperextensao no banco',                            'Lombar, Gluteos',             'Isolado',   'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Costas/Hiperextensoes sem dispositivo (banco).gif',                            'lombar'),
  ('gif-ex-054', 'Levantamento Terra no Smith',                     'levantamento terra no smith',                       'Costas, Gluteos, Posterior',  'Composto',  'Smith',           'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Costas/levantamento terra no smith.gif',                                       'dorsal'),
  ('gif-ex-055', 'Puxada Unilateral no Pulley',                     'puxada unilateral no pulley',                       'Costas, Biceps',              'Composto',  'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Costas/pulley costa unilateral.gif',                                           'dorsal'),
  ('gif-ex-056', 'Puxada na Nuca Pegada Aberta',                    'puxada na nuca pegada aberta',                      'Costas, Biceps',              'Composto',  'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Costas/pulley pegada aberta atras da nuca.gif',                                'dorsal'),
  ('gif-ex-057', 'Puxada Pronada Pegada Aberta',                    'puxada pronada pegada aberta',                      'Costas, Biceps',              'Composto',  'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Costas/pulley pegada aberta pronada.gif',                                      'dorsal'),
  ('gif-ex-058', 'Remada Aberta no Banco Inclinado com Halteres',   'remada aberta no banco inclinado com halteres',     'Costas, Biceps',              'Composto',  'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Costas/remada aberta no banco inclinado com halteres.gif',                     'romboides_trapezio_medio'),
  ('gif-ex-059', 'Remada Baixa no Pulley Supinada',                 'remada baixa no pulley supinada',                   'Costas, Biceps',              'Composto',  'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Costas/remada baixa no pulley pegada aberta supinada.gif',                     'romboides_trapezio_medio'),
  ('gif-ex-060', 'Remada Baixa Unilateral no Cross',                'remada baixa unilateral no cross',                  'Costas, Biceps',              'Composto',  'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Costas/remada baixa unilateral no cross.gif',                                  'romboides_trapezio_medio'),
  ('gif-ex-061', 'Remada Cavalinho com Barra',                      'remada cavalinho com barra',                        'Costas, Biceps',              'Composto',  'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Costas/remada cavalino com barra.gif',                                         'romboides_trapezio_medio'),
  ('gif-ex-062', 'Remada Inclinada no Smith',                       'remada inclinada no smith',                         'Costas, Biceps',              'Composto',  'Smith',           'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Costas/remada inclinada no smith.gif',                                         'romboides_trapezio_medio'),
  ('gif-ex-063', 'Remada Banco Pegada Supinada Fechada',            'remada banco pegada supinada fechada',              'Costas, Biceps',              'Composto',  'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Costas/remada inclinda no banco pegada supinda puxada fechada.gif',            'romboides_trapezio_medio'),
  ('gif-ex-064', 'Remada Livre com Halteres',                       'remada livre com halteres',                         'Costas, Biceps',              'Composto',  'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Costas/remada livre  com halteres.gif',                                        'romboides_trapezio_medio'),
  ('gif-ex-065', 'Remada Banco Inclinado Pegada Pronada',           'remada banco inclinado pegada pronada',             'Costas, Biceps',              'Composto',  'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Costas/remada no banco inclinado pegada pronada com barra.gif',                'romboides_trapezio_medio'),
  ('gif-ex-066', 'Remada Unilateral Cavalinho Fechada',             'remada unilateral cavalinho fechada',               'Costas, Biceps',              'Composto',  'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Costas/remada unilateral cavalindo barra puxada fechada.gif',                  'romboides_trapezio_medio'),
  ('gif-ex-067', 'Voador Invertido',                                'voador invertido',                                  'Ombros, Costas',              'Isolado',   'Maquina',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Costas/voador invertido.gif',                                                  'deltoide_posterior'),
  ('gif-ex-068', 'Desenvolvimento com Elastico',                    'desenvolvimento com elastico',                      'Ombros',                      'Composto',  'Elastico',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Ombro/Desenvolmento Frontal com Elastico.gif',                                 'deltoide_anterior'),
  ('gif-ex-069', 'Desenvolvimento com Rotacao',                     'desenvolvimento com rotacao',                       'Ombros',                      'Composto',  'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Ombro/desenvolvimento com rotacao.gif',                                        'deltoide_anterior'),
  ('gif-ex-070', 'Desenvolvimento no Smith Nuca',                   'desenvolvimento no smith nuca',                     'Ombros, Triceps',             'Composto',  'Smith',           'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Ombro/desenvolvimento no smith barra na nuca.gif',                             'deltoide_anterior'),
  ('gif-ex-071', 'Desenvolvimento por Tras com Barra',              'desenvolvimento por tras com barra',                'Ombros, Triceps',             'Composto',  'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Ombro/Desenvolvimento por tras com barra.gif',                                 'deltoide_anterior'),
  ('gif-ex-072', 'Desenvolvimento Sentado no Smith',                'desenvolvimento sentado no smith',                  'Ombros, Triceps',             'Composto',  'Smith',           'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Ombro/Desenvolvimento Sentado Smith.gif',                                      'deltoide_anterior'),
  ('gif-ex-073', 'Desenvolvimento Barra Frente Sentado',            'desenvolvimento barra frente sentado',              'Ombros, Triceps',             'Composto',  'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Ombro/desnvolvimento barra frente sentado.gif',                                'deltoide_anterior'),
  ('gif-ex-074', 'Elevacao Bilateral na Maquina',                   'elevacao bilateral na maquina',                     'Ombros',                      'Isolado',   'Maquina',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Ombro/elevacao bilateral na maquina.gif',                                      'deltoide_lateral'),
  ('gif-ex-075', 'Elevacao Frontal no Crossover',                   'elevacao frontal no crossover',                     'Ombros',                      'Isolado',   'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Ombro/Elevacao Frontal Crossover.gif',                                         'deltoide_anterior'),
  ('gif-ex-076', 'Elevacao Lateral Inclinado Sentado',              'elevacao lateral inclinado sentado',                'Ombros',                      'Isolado',   'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Ombro/elevacao lateral inclinado sentado.gif',                                 'deltoide_lateral'),
  ('gif-ex-077', 'Elevacao Unilateral no Cross',                    'elevacao unilateral no cross',                      'Ombros',                      'Isolado',   'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Ombro/elevacao unilateral no cross.gif',                                       'deltoide_lateral'),
  ('gif-ex-078', 'Remada Alta com Barra Ombro',                     'remada alta com barra ombro',                       'Ombros, Trapezio',            'Composto',  'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Ombro/remada livre com barra.gif',                                             'deltoide_lateral'),
  ('gif-ex-079', 'Rosca Concentrada Unilateral no Cross',           'rosca concentrada unilateral no cross',             'Biceps',                      'Isolado',   'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Biceps/biceps concentrado unilateral no cross.gif',                            'biceps'),
  ('gif-ex-080', 'Rosca Unilateral Polia Alta',                     'rosca unilateral polia alta',                       'Biceps',                      'Isolado',   'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Biceps/biceps unilateral polia alta cross.gif',                                'biceps'),
  ('gif-ex-081', 'Rosca Direta no Banco Scott',                     'rosca direta no banco scott',                       'Biceps',                      'Isolado',   'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Biceps/rosca  direta no banco scort.gif',                                      'biceps'),
  ('gif-ex-082', 'Rosca Alternada Biarticular',                     'rosca alternada biarticular',                       'Biceps',                      'Isolado',   'Maquina',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Biceps/rosca alternada aparelho biarticular.gif',                              'biceps'),
  ('gif-ex-083', 'Rosca Direta Apoiada Barra W',                    'rosca direta apoiada barra w',                      'Biceps',                      'Isolado',   'Barra W',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Biceps/rosca direta apaiada no banco barra W.gif',                             'biceps'),
  ('gif-ex-084', 'Rosca Direta Pegada Fechada Sentado',             'rosca direta pegada fechada sentado',               'Biceps',                      'Isolado',   'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Biceps/rosca direta barra pegada fechada sentado no banco.gif',               'biceps'),
  ('gif-ex-085', 'Rosca Neutra Banco Scott Aparelho',               'rosca neutra banco scott aparelho',                 'Biceps',                      'Isolado',   'Maquina',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Biceps/rosca neutra no banco scort aparelho.gif',                              'biceps'),
  ('gif-ex-086', 'Rosca Scott Barra W',                             'rosca scott barra w',                               'Biceps',                      'Isolado',   'Barra W',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Biceps/rosca no banco scort barra W.gif',                                      'biceps'),
  ('gif-ex-087', 'Rosca Scott Unilateral com Haltere',              'rosca scott unilateral com haltere',                'Biceps',                      'Isolado',   'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Biceps/Rosca Scott Unil com Halteres.gif',                                     'biceps'),
  ('gif-ex-088', 'Rosca Unilateral com Haltere Sentado',            'rosca unilateral com haltere sentado',              'Biceps',                      'Isolado',   'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Biceps/rosca unilateral com halteres sentado no banco.gif',                    'biceps'),
  ('gif-ex-089', 'Triceps Frances Barra W',                         'triceps frances barra w',                           'Triceps',                     'Isolado',   'Barra W',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'TRÍCEPS (1)/Triceps frances barra w.gif',                                                   'triceps_cabeca_longa'),
  ('gif-ex-090', 'Triceps Frances Inclinado com Haltere',           'triceps frances inclinado com haltere',             'Triceps',                     'Isolado',   'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'TRÍCEPS (1)/Triceps frances inclinado com halter.gif',                                      'triceps_cabeca_longa'),
  ('gif-ex-091', 'Triceps Frances Unilateral no Cabo',              'triceps frances unilateral no cabo',                'Triceps',                     'Isolado',   'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'TRÍCEPS (1)/Triceps frances unilateral cabo.gif',                                           'triceps_cabeca_longa'),
  ('gif-ex-092', 'Triceps Testa Unilateral',                        'triceps testa unilateral',                          'Triceps',                     'Isolado',   'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'TRÍCEPS (1)/Triceps testa unilateral.gif',                                                  'triceps_cabeca_longa'),
  ('gif-ex-093', 'Triceps Extensao Unilateral no Cabo',             'triceps extensao unilateral no cabo',               'Triceps',                     'Isolado',   'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'TRÍCEPS (1)/Triceps extensao unilateral.gif',                                               'triceps_lateral_medial'),
  ('gif-ex-094', 'Triceps na Maquina',                              'triceps na maquina',                                'Triceps',                     'Isolado',   'Maquina',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'TRÍCEPS (1)/Triceps maquina 01.gif',                                                        'triceps_lateral_medial'),
  ('gif-ex-095', 'Triceps Maquina Variacao',                        'triceps maquina variacao',                          'Triceps',                     'Isolado',   'Maquina',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'TRÍCEPS (1)/Triceps maquina 02.gif',                                                        'triceps_lateral_medial'),
  ('gif-ex-096', 'Triceps Coice no Cabo',                           'triceps coice no cabo',                             'Triceps',                     'Isolado',   'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'TRÍCEPS (1)/cable-tricep-kickback.gif',                                                      'triceps_lateral_medial'),
  ('gif-ex-097', 'Supino Fechado',                                  'supino fechado',                                    'Triceps, Peito',              'Composto',  'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'TRÍCEPS (1)/close-grip-bench-press-movement.gif',                                           'triceps_lateral_medial'),
  ('gif-ex-098', 'Triceps Cabo Sobre a Cabeca',                     'triceps cabo sobre a cabeca',                       'Triceps',                     'Isolado',   'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'TRÍCEPS (1)/overhead-cable-tricep-extension.gif',                                           'triceps_cabeca_longa'),
  ('gif-ex-099', 'Paralelas no Graviton Triceps',                   'paralelas no graviton triceps',                     'Triceps, Peito, Ombros',      'Composto',  'Graviton',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'TRÍCEPS (1)/Paralelas no graviton.gif',                                                     'triceps_lateral_medial'),
  ('gif-ex-100', 'Apoio de Frente Pegada Fechada',                  'apoio de frente pegada fechada',                    'Triceps, Peito',              'Composto',  'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Triceps/Apoio de frente pegada fechada parede.gif',                            'triceps_lateral_medial'),
  ('gif-ex-101', 'Mergulho na Maquina Arnold',                      'mergulho na maquina arnold',                        'Triceps, Peito, Ombros',      'Composto',  'Maquina',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Triceps/arnold_dips-maschine.gif',                                             'triceps_lateral_medial'),
  ('gif-ex-102', 'Flexao Pegada Fechada',                           'flexao pegada fechada',                             'Triceps, Peito',              'Composto',  'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Triceps/flex de cotovelo fechado.gif',                                         'triceps_lateral_medial'),
  ('gif-ex-103', 'Flexao Pegada Fechada Livre',                     'flexao pegada fechada livre',                       'Triceps, Peito',              'Composto',  'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Triceps/flex de cotovelo fechado livre.gif',                                   'triceps_lateral_medial'),
  ('gif-ex-104', 'Supino Declinado no Smith Triceps',               'supino declinado no smith triceps',                 'Triceps, Peito',              'Composto',  'Smith',           'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Triceps/supino declinado no smit.gif',                                         'triceps_lateral_medial'),
  ('gif-ex-105', 'Supino Declinado Pegada Fechada',                 'supino declinado pegada fechada',                   'Triceps, Peito',              'Composto',  'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Triceps/Supino declinado pegada fechada.gif',                                  'triceps_lateral_medial'),
  ('gif-ex-106', 'Triceps na Paralela Maquina',                     'triceps na paralela maquina',                       'Triceps, Peito, Ombros',      'Composto',  'Maquina',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Triceps/triceps na paralela maquiba.gif',                                      'triceps_lateral_medial'),
  ('gif-ex-107', 'Mergulho no Banco',                               'mergulho no banco',                                 'Triceps, Peito, Ombros',      'Composto',  'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Triceps/triceps paralelo no banco.gif',                                        'triceps_lateral_medial'),
  ('gif-ex-108', 'Triceps Coice Unilateral com Haltere',            'triceps coice unilateral com haltere',              'Triceps',                     'Isolado',   'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Triceps/triceps patada unilateral com halteres.gif',                           'triceps_lateral_medial'),
  ('gif-ex-109', 'Triceps Testa com Haltere',                       'triceps testa com haltere',                         'Triceps',                     'Isolado',   'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Triceps/Triceps testa com halteres.gif',                                       'triceps_cabeca_longa'),
  ('gif-ex-110', 'Triceps Testa Alternado',                         'triceps testa alternado',                           'Triceps',                     'Isolado',   'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Triceps/triceps tresta com halteres.gif',                                      'triceps_cabeca_longa'),
  ('gif-ex-111', 'Abdominal Alternando Pernas',                     'abdominal alternando pernas',                       'Abdomen',                     'Isolado',   'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'ABDOMEN CORE (1)/ABS alternando pernas.gif',                                                'abdomen'),
  ('gif-ex-112', 'Abdominal no Banco',                              'abdominal no banco',                                'Abdomen',                     'Isolado',   'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'ABDOMEN CORE (1)/Abs banco.gif',                                                            'abdomen'),
  ('gif-ex-113', 'Abdominal Banco Declinado',                       'abdominal banco declinado',                         'Abdomen',                     'Isolado',   'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'ABDOMEN CORE (1)/ABS banco declinado completo.gif',                                         'abdomen'),
  ('gif-ex-114', 'Abdominal Bola Flexao de Quadril',                'abdominal bola flexao de quadril',                  'Abdomen, Core',               'Isolado',   'Bola',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'ABDOMEN CORE (1)/Abs bola flexao de quadril.gif',                                           'abdomen'),
  ('gif-ex-115', 'Abdominal com Flexao Lateral',                    'abdominal com flexao lateral',                      'Abdomen',                     'Isolado',   'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'ABDOMEN CORE (1)/ABS com flexao lateral.gif',                                               'obliquo'),
  ('gif-ex-116', 'Abdominal Lateral',                               'abdominal lateral',                                 'Abdomen',                     'Isolado',   'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'ABDOMEN CORE (1)/Abs lateral.gif',                                                          'obliquo'),
  ('gif-ex-117', 'Abdominal na Maquina',                            'abdominal na maquina',                              'Abdomen',                     'Isolado',   'Maquina',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'ABDOMEN CORE (1)/ABS maquina.gif',                                                          'abdomen'),
  ('gif-ex-118', 'Abdominal Polia Alta',                            'abdominal polia alta',                              'Abdomen',                     'Isolado',   'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'ABDOMEN CORE (1)/ABS polia alta.gif',                                                       'abdomen'),
  ('gif-ex-119', 'Abdominal Polia Alta Variacao',                   'abdominal polia alta variacao',                     'Abdomen',                     'Isolado',   'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'ABDOMEN CORE (1)/ABS polia alta 2.gif',                                                     'abdomen'),
  ('gif-ex-120', 'Abdominal Remador Pernas Estendidas',             'abdominal remador pernas estendidas',               'Abdomen',                     'Isolado',   'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'ABDOMEN CORE (1)/ABS remador pernas extendidas.gif',                                        'abdomen'),
  ('gif-ex-121', 'Sit-Up Convencional',                             'sit-up convencional',                               'Abdomen',                     'Isolado',   'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'ABDOMEN CORE (1)/conventional-sit-up.gif',                                                  'abdomen'),
  ('gif-ex-122', 'Crunch Pernas Elevadas',                          'crunch pernas elevadas',                            'Abdomen',                     'Isolado',   'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'ABDOMEN CORE (1)/Crunch pernas elevadas.gif',                                               'abdomen'),
  ('gif-ex-123', 'Dead Bug',                                        'dead bug',                                          'Abdomen, Core',               'Isolado',   'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'ABDOMEN CORE (1)/Dead bug.gif',                                                             'core'),
  ('gif-ex-124', 'Flexao de Quadril no Banco',                      'flexao de quadril no banco',                        'Abdomen',                     'Isolado',   'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'ABDOMEN CORE (1)/Flexao de quadril banco.gif',                                              'abdomen'),
  ('gif-ex-125', 'Flexao Lateral com Bola',                         'flexao lateral com bola',                           'Abdomen',                     'Isolado',   'Bola',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'ABDOMEN CORE (1)/Flexao lateral bola.gif',                                                  'obliquo'),
  ('gif-ex-126', 'Obliquo Polia Baixa',                             'obliquo polia baixa',                               'Abdomen',                     'Isolado',   'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'ABDOMEN CORE (1)/obliquo polia baixa.gif',                                                  'obliquo'),
  ('gif-ex-127', 'Sit-Up com Peso',                                 'sit-up com peso',                                   'Abdomen',                     'Isolado',   'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'ABDOMEN CORE (1)/weightedsitups.gif',                                                       'abdomen'),
  ('gif-ex-128', 'Agachamento Frontal com Barra',                   'agachamento frontal com barra',                     'Quadriceps, Gluteos',         'Composto',  'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'MEMBROS INFERIORES E GLÚTEOS (1)/Agachamento frontal 02.gif',                               'quadriceps'),
  ('gif-ex-129', 'Agachamento no Smith',                            'agachamento no smith',                              'Quadriceps, Gluteos',         'Composto',  'Smith',           'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'MEMBROS INFERIORES E GLÚTEOS (1)/Agchamento smith.gif',                                     'quadriceps'),
  ('gif-ex-130', 'Avanco com Barra',                                'avanco com barra',                                  'Quadriceps, Gluteos',         'Composto',  'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'MEMBROS INFERIORES E GLÚTEOS (1)/Avanco com barra.gif',                                     'quadriceps'),
  ('gif-ex-131', 'Afundo Cruzado',                                  'afundo cruzado',                                    'Quadriceps, Gluteos',         'Composto',  'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'MEMBROS INFERIORES E GLÚTEOS (1)/Afundo cruzando perna de tras.gif',                        'quadriceps'),
  ('gif-ex-132', 'Afundo Lateral com Barra',                        'afundo lateral com barra',                          'Quadriceps, Adutores',        'Composto',  'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'MEMBROS INFERIORES E GLÚTEOS (1)/Afundo lateral com barra.gif',                             'adutores'),
  ('gif-ex-133', 'Aviao Unilateral Good Morning Unilateral',        'aviao unilateral good morning unilateral',          'Gluteos, Lombar',             'Composto',  'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'MEMBROS INFERIORES E GLÚTEOS (1)/Aviao unilateral.gif',                                     'gluteos'),
  ('gif-ex-134', 'Extensao de Quadril com Elastico',                'extensao de quadril com elastico',                  'Gluteos',                     'Isolado',   'Elastico',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'MEMBROS INFERIORES E GLÚTEOS (1)/band-standing-hip-extension.gif',                          'gluteos'),
  ('gif-ex-135', 'Bom Dia com Barra',                               'bom dia com barra',                                 'Lombar, Isquiotibiais',       'Composto',  'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'MEMBROS INFERIORES E GLÚTEOS (1)/barbell-good-morning.gif',                                 'lombar'),
  ('gif-ex-136', 'Cadeira Adutora',                                 'cadeira adutora',                                   'Adutores',                    'Isolado',   'Maquina',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'MEMBROS INFERIORES E GLÚTEOS (1)/Cadeira adutora.gif',                                      'adutores'),
  ('gif-ex-137', 'Clean Arranco',                                   'clean arranco',                                     'Quadriceps, Gluteos, Lombar', 'Composto',  'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'MEMBROS INFERIORES E GLÚTEOS (1)/Clean.gif',                                                'quadriceps'),
  ('gif-ex-138', 'Elevacao Pelvica',                                'elevacao pelvica',                                  'Gluteos',                     'Isolado',   'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'MEMBROS INFERIORES E GLÚTEOS (1)/Elevacao pelvica.gif',                                     'gluteos'),
  ('gif-ex-139', 'Elevacao Pelvica Unilateral',                     'elevacao pelvica unilateral',                       'Gluteos',                     'Isolado',   'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'MEMBROS INFERIORES E GLÚTEOS (1)/ELEVACAO PELVICA APOIO UNILATERAL.gif',                    'gluteos'),
  ('gif-ex-140', 'Elevacao Pelvica Pes Elevados',                   'elevacao pelvica pes elevados',                     'Gluteos',                     'Isolado',   'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'MEMBROS INFERIORES E GLÚTEOS (1)/Elevacao pelvica pes elevados.gif',                        'gluteos'),
  ('gif-ex-141', 'Extensao de Quadril a Quatro Apoios',             'extensao de quadril a quatro apoios',               'Gluteos',                     'Isolado',   'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'MEMBROS INFERIORES E GLÚTEOS (1)/Extensao 6 apoios.gif',                                    'gluteos'),
  ('gif-ex-142', 'Extensao de Quadril no Cabo',                     'extensao de quadril no cabo',                       'Gluteos',                     'Isolado',   'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'MEMBROS INFERIORES E GLÚTEOS (1)/Extensao de quadril 01.gif',                               'gluteos'),
  ('gif-ex-143', 'Flexao Nordica',                                  'flexao nordica',                                    'Isquiotibiais',               'Isolado',   'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'MEMBROS INFERIORES E GLÚTEOS (1)/Flexao nordica.gif',                                       'isquiotibiais'),
  ('gif-ex-144', 'Flexora em Pe Unilateral',                        'flexora em pe unilateral',                          'Isquiotibiais',               'Isolado',   'Maquina',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'MEMBROS INFERIORES E GLÚTEOS (1)/Flexora em pe unilateral.gif',                             'isquiotibiais'),
  ('gif-ex-145', 'Frog Pump',                                       'frog pump',                                         'Gluteos',                     'Isolado',   'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'MEMBROS INFERIORES E GLÚTEOS (1)/frog-pump.gif',                                            'gluteos'),
  ('gif-ex-146', 'Agachamento Frontal Front Squat',                 'agachamento frontal front squat',                   'Quadriceps, Gluteos',         'Composto',  'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'MEMBROS INFERIORES E GLÚTEOS (1)/Front squat.gif',                                          'quadriceps'),
  ('gif-ex-147', 'Glute Bridge',                                    'glute bridge',                                      'Gluteos',                     'Isolado',   'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'MEMBROS INFERIORES E GLÚTEOS (1)/glute-bridge.gif',                                         'gluteos'),
  ('gif-ex-148', 'Bom Dia Good Morning',                            'bom dia good morning',                              'Lombar, Isquiotibiais',       'Composto',  'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'MEMBROS INFERIORES E GLÚTEOS (1)/Good morning.gif',                                         'lombar'),
  ('gif-ex-149', 'Agachamento Pistol',                              'agachamento pistol',                                'Quadriceps, Gluteos',         'Composto',  'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'MEMBROS INFERIORES E GLÚTEOS (1)/Pistol 02.gif',                                            'quadriceps'),
  ('gif-ex-150', 'Passada para Tras',                               'passada para tras',                                 'Quadriceps, Gluteos',         'Composto',  'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'MEMBROS INFERIORES E GLÚTEOS (1)/Recuo.gif',                                                'quadriceps'),
  ('gif-ex-151', 'Stiff com Halteres',                              'stiff com halteres',                                'Isquiotibiais, Gluteos',      'Composto',  'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'MEMBROS INFERIORES E GLÚTEOS (1)/Stiff com halteres.gif',                                   'isquiotibiais'),
  ('gif-ex-152', 'Adutora na Tracao do Cabo',                       'adutora na tracao do cabo',                         'Adutores',                    'Isolado',   'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Membros Inferiores/adutora na tracao do cabo cross.gif',                       'adutores'),
  ('gif-ex-153', 'Agachamento Pes Juntos',                          'agachamento pes juntos',                            'Quadriceps, Gluteos',         'Composto',  'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Membros Inferiores/agachamento livre pes juntos.gif',                          'quadriceps'),
  ('gif-ex-154', 'Agachamento na Maquina',                          'agachamento na maquina',                            'Quadriceps, Gluteos',         'Composto',  'Maquina',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Membros Inferiores/agachamento na maquina.gif',                                'quadriceps'),
  ('gif-ex-155', 'Agachamento Pes Afastados',                       'agachamento pes afastados',                         'Quadriceps, Gluteos, Adutores','Composto', 'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Membros Inferiores/agachamento pes afastados.gif',                             'quadriceps'),
  ('gif-ex-156', 'Agachamento Sumo com Halteres',                   'agachamento sumo com halteres',                     'Quadriceps, Adutores, Gluteos','Composto', 'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Membros Inferiores/agachamento sumo com halteres.gif',                         'adutores'),
  ('gif-ex-157', 'Flexao de Joelho no Cabo',                        'flexao de joelho no cabo',                          'Isquiotibiais',               'Isolado',   'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Membros Inferiores/flex de joelho  em pe no cabo cross.gif',                   'isquiotibiais'),
  ('gif-ex-158', 'Flexao Plantar com Peso Corporal',                'flexao plantar com peso corporal',                  'Panturrilha',                 'Isolado',   'Peso corporal',   'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Membros Inferiores/Flexao Plantar com peso corporal.gif',                      'panturrilha'),
  ('gif-ex-159', 'Leg Press Pes Afastados',                         'leg press pes afastados',                           'Quadriceps, Gluteos, Adutores','Composto', 'Maquina',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Membros Inferiores/leg press pes afastados.gif',                               'quadriceps'),
  ('gif-ex-160', 'Passada a Frente com Barra',                      'passada a frente com barra',                        'Quadriceps, Gluteos',         'Composto',  'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Membros Inferiores/passada a frente com barra.gif',                            'quadriceps'),
  ('gif-ex-161', 'Passada com Halteres',                            'passada com halteres',                              'Quadriceps, Gluteos',         'Composto',  'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Membros Inferiores/passada com halteres.gif',                                  'quadriceps'),
  ('gif-ex-162', 'Retrocesso com Halteres',                         'retrocesso com halteres',                           'Quadriceps, Gluteos',         'Composto',  'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Membros Inferiores/Retrocesso com halteres.gif',                               'quadriceps'),
  ('gif-ex-163', 'Stiff no Smith',                                  'stiff no smith',                                    'Isquiotibiais, Gluteos',      'Composto',  'Smith',           'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Membros Inferiores/stiff no smth.gif',                                         'isquiotibiais'),
  ('gif-ex-164', 'Stiff Unilateral com Kettlebell',                 'stiff unilateral com kettlebell',                   'Isquiotibiais, Gluteos',      'Composto',  'Kettlebell',      'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Membros Inferiores/stiff unilateral com kettibel.gif',                         'isquiotibiais'),
  ('gif-ex-165', 'Encolhimento com Barra',                          'encolhimento com barra',                            'Trapezio',                    'Isolado',   'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'COSTAS E TRAPÉZIO (1)/Encolhimento 3.gif',                                                  'trapezio'),
  ('gif-ex-166', 'Encolhimento na Maquina',                         'encolhimento na maquina',                           'Trapezio',                    'Isolado',   'Maquina',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Trapezio/encolhimento maquina.gif',                                            'trapezio'),
  ('gif-ex-167', 'Encolhimento na Barra Livre',                     'encolhimento na barra livre',                       'Trapezio',                    'Isolado',   'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Trapezio/encolhimento na barra livre.gif',                                     'trapezio'),
  ('gif-ex-168', 'Encolhimento no Smith',                           'encolhimento no smith',                             'Trapezio',                    'Isolado',   'Smith',           'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Trapezio/encolhimento no smith.gif',                                           'trapezio'),
  ('gif-ex-169', 'Encolhimento Pegada Fechada no Cross',            'encolhimento pegada fechada no cross',              'Trapezio',                    'Isolado',   'Cabo',            'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Trapezio/encolhimento pegada fechada barra no cross.gif',                      'trapezio'),
  ('gif-ex-170', 'Encolhimento Sentado com Halteres',               'encolhimento sentado com halteres',                 'Trapezio',                    'Isolado',   'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Trapezio/encolhimento sentado no banco com halteres.gif',                      'trapezio'),
  ('gif-ex-171', 'Encolhimento Sentado Banco Inclinado',            'encolhimento sentado banco inclinado',              'Trapezio',                    'Isolado',   'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Trapezio/encolhimento sentado no banco inlinado com halteres.gif',             'trapezio'),
  ('gif-ex-172', 'Remada Alta com Halteres',                        'remada alta com halteres',                          'Trapezio, Ombros',            'Composto',  'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Trapezio/remada alta com halteres.gif',                                        'trapezio'),
  ('gif-ex-173', 'Remada Alta com Barra',                           'remada alta com barra',                             'Trapezio, Ombros',            'Composto',  'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'Gifs - Bonus/Trapezio/remada alta pegada abeta com barra.gif',                              'trapezio'),
  ('gif-ex-174', 'Remada Alta',                                     'remada alta',                                       'Trapezio, Ombros',            'Composto',  'Barra olimpica',  'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'COSTAS E TRAPÉZIO (1)/Remada alta.gif',                                                     'trapezio'),
  ('gif-ex-175', 'Panturrilha Sentado com Haltere',                 'panturrilha sentado com haltere',                   'Panturrilha',                 'Isolado',   'Haltere',         'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'PANTURRILHA (1)/seated-calf-raise-dumbbell.gif',                                            'panturrilha');
  UPDATE exercises SET media_local = 'PEITORAL (1)/Supino barra.gif'                                     WHERE id = 'seed-ex-001' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'PEITORAL (1)/Supino inclinado.gif'                                 WHERE id = 'seed-ex-002' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'PEITORAL (1)/barbell-decline-bench-press.gif'                      WHERE id = 'seed-ex-003' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'PEITORAL (1)/dumbbell-chest-press.gif'                             WHERE id = 'seed-ex-004' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'PEITORAL (1)/Crucifico com halteres.gif'                           WHERE id = 'seed-ex-005' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'PEITORAL (1)/cable-cross-over.gif'                                 WHERE id = 'seed-ex-006' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'COSTAS E TRAPÉZIO (1)/Pulldown1.gif'                               WHERE id = 'seed-ex-010' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'COSTAS E TRAPÉZIO (1)/Remada inclinada.gif'                        WHERE id = 'seed-ex-011' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'COSTAS E TRAPÉZIO (1)/Remada unilateral.gif'                       WHERE id = 'seed-ex-012' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'COSTAS E TRAPÉZIO (1)/Remada cabo.gif'                             WHERE id = 'seed-ex-013' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'Gifs - Bonus/Membros Inferiores/levantamento terra com barra.gif'  WHERE id = 'seed-ex-014' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'Gifs - Bonus/Ombro/Desenvolvimento com Barra.gif'                  WHERE id = 'seed-ex-015' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'Gifs - Bonus/Ombro/Desenvolvimento com Halteres.gif'               WHERE id = 'seed-ex-016' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'Gifs - Bonus/Ombro/elevacao unilateral frontal.gif'                WHERE id = 'seed-ex-018' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'Gifs - Bonus/Trapezio/encolhimento livre com halteres.gif'         WHERE id = 'seed-ex-020' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'Gifs - Bonus/Biceps/rosca direta barra W.gif'                      WHERE id = 'seed-ex-021' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'Gifs - Bonus/Biceps/rosca alternada pegada neutra sentado no banco.gif' WHERE id = 'seed-ex-022' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'Gifs - Bonus/Biceps/Rosca Concentrada 2.gif'                       WHERE id = 'seed-ex-023' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'TRÍCEPS (1)/Triceps testa 01.gif'                                  WHERE id = 'seed-ex-025' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'TRÍCEPS (1)/Triceps pulley.gif'                                    WHERE id = 'seed-ex-026' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'TRÍCEPS (1)/cable-tricep-kickback.gif'                             WHERE id = 'seed-ex-027' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'TRÍCEPS (1)/Triceps frances.gif'                                   WHERE id = 'seed-ex-028' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'TRÍCEPS (1)/bench-tricep-dips.gif'                                 WHERE id = 'seed-ex-029' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'ABDOMEN CORE (1)/Crunch 4.gif'                                     WHERE id = 'seed-ex-030' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'ABDOMEN CORE (1)/Prancha frente tras.gif'                          WHERE id = 'seed-ex-031' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'ABDOMEN CORE (1)/Crunch reverso.gif'                               WHERE id = 'seed-ex-032' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'ABDOMEN CORE (1)/ABS obliquo.gif'                                  WHERE id = 'seed-ex-033' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'MEMBROS INFERIORES E GLÚTEOS (1)/Leg press 45.gif'                 WHERE id = 'seed-ex-035' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'MEMBROS INFERIORES E GLÚTEOS (1)/Passadas com halteres.gif'        WHERE id = 'seed-ex-036' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'MEMBROS INFERIORES E GLÚTEOS (1)/Mesa flexora.gif'                 WHERE id = 'seed-ex-038' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'MEMBROS INFERIORES E GLÚTEOS (1)/barbell-romanian-deadlift-movement.gif' WHERE id = 'seed-ex-039' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'MEMBROS INFERIORES E GLÚTEOS (1)/barbell-hip-thrust.gif'           WHERE id = 'seed-ex-040' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'PANTURRILHA (1)/seated-calf-raise-dumbbell.gif'                    WHERE id = 'seed-ex-043' AND media_local IS NULL`,

  // v14: GIF mappings for seed exercises that were missing media
  `UPDATE exercises SET media_local = 'PEITORAL (1)/push-up-bars.gif'                                              WHERE id = 'seed-ex-007' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'COSTAS E TRAPÉZIO (1)/band-assisted-pull-up.gif'                            WHERE id = 'seed-ex-009' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'Gifs - Bonus/Ombro/elevacao lateral inclinado sentado.gif'                  WHERE id = 'seed-ex-017' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'Gifs - Bonus/Costas/voador invertido.gif'                                   WHERE id = 'seed-ex-019' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'Gifs - Bonus/Biceps/biceps concentrado unilateral no cross.gif'             WHERE id = 'seed-ex-024' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'Gifs - Bonus/Membros Inferiores/agachamento livre pes juntos.gif'           WHERE id = 'seed-ex-034' AND media_local IS NULL;
  UPDATE exercises SET media_local = 'Gifs - Bonus/Membros Inferiores/Flexao Plantar com peso corporal.gif'       WHERE id = 'seed-ex-042' AND media_local IS NULL`,

  // v15: remove seed exercises that have no GIF (seed-ex-008 Pullover, seed-ex-037 Extensao de Joelhos, seed-ex-041 Abducao de Quadril).
  // Cleans up existing devices that received them via v4/v10. sessao_exercicios rows are intentionally kept (nome_snapshot preserves history).
  `DELETE FROM treino_exercicios WHERE exercicio_id IN ('seed-ex-008','seed-ex-037','seed-ex-041');
   DELETE FROM exercise_alternatives WHERE exercicio_id IN ('seed-ex-008','seed-ex-037','seed-ex-041') OR alternativa_id IN ('seed-ex-008','seed-ex-037','seed-ex-041');
   DELETE FROM exercises WHERE id IN ('seed-ex-008','seed-ex-037','seed-ex-041');`,

  // v16: planejamento semanal — 7 linhas fixas, uma por dia da semana
  `CREATE TABLE IF NOT EXISTS plano_semanal (
     dia_semana TEXT PRIMARY KEY NOT NULL,
     treino_id  TEXT REFERENCES treinos(id) ON DELETE SET NULL
   );
   INSERT OR IGNORE INTO plano_semanal (dia_semana, treino_id) VALUES
     ('seg', NULL), ('ter', NULL), ('qua', NULL), ('qui', NULL),
     ('sex', NULL), ('sab', NULL), ('dom', NULL);`,

  // v17: remove tipo_serie column — warm-up sets concept removed from product
  `ALTER TABLE series_registradas DROP COLUMN tipo_serie;`,

  // v18: re-add tipo_serie to series_registradas (removed in v17, restored for warm-up set tracking)
  // Existing rows default to 'valida' which is semantically correct — they were all working sets.
  `ALTER TABLE series_registradas ADD COLUMN tipo_serie TEXT NOT NULL DEFAULT 'valida';`,

  // v19: sync metadata for cloud sync (sub-project 0).
  // NOTE: this is the 19th migration → user_version 19. (An earlier entry is labelled "v16: planejamento semanal".)
  `ALTER TABLE exercises          ADD COLUMN deleted_at TEXT;
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
   ALTER TABLE settings           ADD COLUMN server_rev INTEGER;
   UPDATE treino_exercicios  SET updated_at = '2024-01-01T00:00:00.000Z' WHERE updated_at IS NULL;
   UPDATE sessao_treinos     SET updated_at = COALESCE(data_hora_inicio, '2024-01-01T00:00:00.000Z') WHERE updated_at IS NULL;
   UPDATE sessao_exercicios  SET updated_at = '2024-01-01T00:00:00.000Z' WHERE updated_at IS NULL;
   UPDATE series_registradas SET updated_at = '2024-01-01T00:00:00.000Z' WHERE updated_at IS NULL;
   UPDATE registros_peso     SET updated_at = COALESCE(data_registro, '2024-01-01T00:00:00.000Z') WHERE updated_at IS NULL;
   UPDATE exercise_alternatives SET updated_at = '2024-01-01T00:00:00.000Z' WHERE updated_at IS NULL;
   UPDATE settings           SET updated_at = '2024-01-01T00:00:00.000Z' WHERE updated_at IS NULL;`,

  // v20: exercise intelligence — structured biomechanical fields + typed alternatives
  // musculo_alvo column format changes from plain string to JSON array.
  // sessao_exercicios.musculo_alvo_snapshot also becomes JSON array.
  `ALTER TABLE exercises ADD COLUMN movement_pattern TEXT;
   ALTER TABLE exercises ADD COLUMN stabilizers TEXT;
   ALTER TABLE exercises ADD COLUMN execution_type TEXT;
   ALTER TABLE exercises ADD COLUMN name_variations TEXT;
   ALTER TABLE exercises ADD COLUMN primary_equipment TEXT;
   ALTER TABLE exercises ADD COLUMN secondary_equipment TEXT;
   ALTER TABLE exercises ADD COLUMN catalog_version INTEGER NOT NULL DEFAULT 0;
   CREATE TABLE IF NOT EXISTS exercise_equivalent_alternatives (
     exercicio_id   TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
     alternativa_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
     PRIMARY KEY (exercicio_id, alternativa_id)
   );
   CREATE TABLE IF NOT EXISTS exercise_muscle_group_alternatives (
     exercicio_id   TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
     alternativa_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
     PRIMARY KEY (exercicio_id, alternativa_id)
   );
   ALTER TABLE sessao_exercicios ADD COLUMN movement_pattern_snapshot TEXT;
   UPDATE exercises
     SET musculo_alvo = json_array(musculo_alvo)
     WHERE musculo_alvo IS NOT NULL AND musculo_alvo NOT LIKE '[%';
   UPDATE sessao_exercicios
     SET musculo_alvo_snapshot = json_array(musculo_alvo_snapshot)
     WHERE musculo_alvo_snapshot IS NOT NULL AND musculo_alvo_snapshot NOT LIKE '[%';`,
];

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
      await this.runMigrationStep(database, migrations[i]);
      await database.execAsync(`PRAGMA user_version = ${i + 1}`);
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
    const statements = this.splitSqlStatements(migration);

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

  /**
   * Split SQL statements respecting quoted strings and other delimiters.
   * This is more robust than simply splitting on ';' since semicolons can appear in string literals.
   *
   * @param sql SQL string potentially containing multiple statements
   * @returns Array of individual SQL statements
   */
  private splitSqlStatements(sql: string): string[] {
    const statements: string[] = [];
    let current = '';
    let inString = false;
    let stringChar = '';
    let inLineComment = false;
    let inBlockComment = false;

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const nextChar = sql[i + 1];
      const prevChar = i > 0 ? sql[i - 1] : '';

      // Handle line comments
      if (!inString && !inBlockComment && char === '-' && nextChar === '-') {
        inLineComment = true;
        current += char;
        continue;
      }

      // Handle block comments
      if (!inString && !inLineComment && char === '/' && nextChar === '*') {
        inBlockComment = true;
        current += char;
        continue;
      }

      if (inBlockComment && char === '*' && nextChar === '/') {
        inBlockComment = false;
        current += char + nextChar;
        i++;
        continue;
      }

      // Handle newline (ends line comment)
      if (inLineComment && (char === '\n' || char === '\r')) {
        inLineComment = false;
        current += char;
        continue;
      }

      // Handle string literals
      if ((char === '"' || char === "'" || char === '`') && !inLineComment && !inBlockComment) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar && prevChar !== '\\') {
          inString = false;
          stringChar = '';
        }
      }

      current += char;

      // Split on semicolon if not in string/comment
      if (char === ';' && !inString && !inLineComment && !inBlockComment) {
        const trimmed = current.trim().slice(0, -1).trim(); // Remove trailing ;
        if (trimmed.length > 0) {
          statements.push(trimmed);
        }
        current = '';
      }
    }

    // Add remaining statement if any
    const trimmed = current.trim();
    if (trimmed.length > 0) {
      statements.push(trimmed);
    }

    return statements;
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
