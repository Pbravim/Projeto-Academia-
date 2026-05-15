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
  ('seed-ex-008', 'Pullover com Haltere',           'pullover com haltere',          'Costas, Peito',                  'Isolado',   'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
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
  ('seed-ex-037', 'Extensao de Joelhos',            'extensao de joelhos',           'Quadriceps',                     'Isolado',   'Maquina',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-038', 'Leg Curl',                       'leg curl',                      'Posterior',                      'Isolado',   'Maquina',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-039', 'Stiff com Barra',                'stiff com barra',               'Posterior, Gluteos',             'Composto',  'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-040', 'Hip Thrust com Barra',           'hip thrust com barra',          'Gluteos, Posterior',             'Composto',  'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-041', 'Abducao de Quadril',             'abducao de quadril',            'Gluteos',                        'Isolado',   'Maquina',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
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
   UPDATE exercises SET musculo_alvo = 'dorsal'                  WHERE id IN ('seed-ex-008','seed-ex-009','seed-ex-010','seed-ex-014');
   UPDATE exercises SET musculo_alvo = 'romboides_trapezio_medio' WHERE id IN ('seed-ex-011','seed-ex-012','seed-ex-013');
   UPDATE exercises SET musculo_alvo = 'deltoide_anterior'       WHERE id IN ('seed-ex-015','seed-ex-016','seed-ex-018');
   UPDATE exercises SET musculo_alvo = 'deltoide_lateral'        WHERE id = 'seed-ex-017';
   UPDATE exercises SET musculo_alvo = 'deltoide_posterior'      WHERE id = 'seed-ex-019';
   UPDATE exercises SET musculo_alvo = 'trapezio'                WHERE id = 'seed-ex-020';
   UPDATE exercises SET musculo_alvo = 'biceps'                  WHERE id IN ('seed-ex-021','seed-ex-022','seed-ex-023','seed-ex-024');
   UPDATE exercises SET musculo_alvo = 'triceps_cabeca_longa'    WHERE id IN ('seed-ex-025','seed-ex-028');
   UPDATE exercises SET musculo_alvo = 'triceps_lateral_medial'  WHERE id IN ('seed-ex-026','seed-ex-027','seed-ex-029');
   UPDATE exercises SET musculo_alvo = 'abdomen'                 WHERE id IN ('seed-ex-030','seed-ex-031','seed-ex-032','seed-ex-033');
   UPDATE exercises SET musculo_alvo = 'quadriceps'              WHERE id IN ('seed-ex-034','seed-ex-035','seed-ex-036','seed-ex-037');
   UPDATE exercises SET musculo_alvo = 'isquiotibiais'           WHERE id IN ('seed-ex-038','seed-ex-039');
   UPDATE exercises SET musculo_alvo = 'gluteos'                 WHERE id IN ('seed-ex-040','seed-ex-041');
   UPDATE exercises SET musculo_alvo = 'panturrilha'             WHERE id IN ('seed-ex-042','seed-ex-043');`,

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
  ('seed-ex-008', 'Pullover com Haltere',           'pullover com haltere',          'Costas, Peito',                  'Isolado',   'Haltere',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
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
  ('seed-ex-037', 'Extensao de Joelhos',            'extensao de joelhos',           'Quadriceps',                     'Isolado',   'Maquina',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-038', 'Leg Curl',                       'leg curl',                      'Posterior',                      'Isolado',   'Maquina',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-039', 'Stiff com Barra',                'stiff com barra',               'Posterior, Gluteos',             'Composto',  'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-040', 'Hip Thrust com Barra',           'hip thrust com barra',          'Gluteos, Posterior',             'Composto',  'Barra olimpica', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-041', 'Abducao de Quadril',             'abducao de quadril',            'Gluteos',                        'Isolado',   'Maquina',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-042', 'Panturrilha em Pe',              'panturrilha em pe',             'Panturrilha',                    'Isolado',   'Maquina',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('seed-ex-043', 'Panturrilha Sentado',            'panturrilha sentado',           'Panturrilha',                    'Isolado',   'Maquina',        'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');
  UPDATE exercises SET musculo_alvo = 'peitoral_medio'          WHERE id IN ('seed-ex-001','seed-ex-004','seed-ex-005','seed-ex-006','seed-ex-007') AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'peitoral_superior'       WHERE id = 'seed-ex-002' AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'peitoral_inferior'       WHERE id = 'seed-ex-003' AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'dorsal'                  WHERE id IN ('seed-ex-008','seed-ex-009','seed-ex-010','seed-ex-014') AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'romboides_trapezio_medio' WHERE id IN ('seed-ex-011','seed-ex-012','seed-ex-013') AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'deltoide_anterior'       WHERE id IN ('seed-ex-015','seed-ex-016','seed-ex-018') AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'deltoide_lateral'        WHERE id = 'seed-ex-017' AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'deltoide_posterior'      WHERE id = 'seed-ex-019' AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'trapezio'                WHERE id = 'seed-ex-020' AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'biceps'                  WHERE id IN ('seed-ex-021','seed-ex-022','seed-ex-023','seed-ex-024') AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'triceps_cabeca_longa'    WHERE id IN ('seed-ex-025','seed-ex-028') AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'triceps_lateral_medial'  WHERE id IN ('seed-ex-026','seed-ex-027','seed-ex-029') AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'abdomen'                 WHERE id IN ('seed-ex-030','seed-ex-031','seed-ex-032','seed-ex-033') AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'quadriceps'              WHERE id IN ('seed-ex-034','seed-ex-035','seed-ex-036','seed-ex-037') AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'isquiotibiais'           WHERE id IN ('seed-ex-038','seed-ex-039') AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'gluteos'                 WHERE id IN ('seed-ex-040','seed-ex-041') AND musculo_alvo IS NULL;
  UPDATE exercises SET musculo_alvo = 'panturrilha'             WHERE id IN ('seed-ex-042','seed-ex-043') AND musculo_alvo IS NULL`,

  // v11: sessões podem ser arquivadas (soft-delete) — ocultas da evolução mas não apagadas
  `ALTER TABLE sessao_treinos ADD COLUMN arquivado INTEGER NOT NULL DEFAULT 0`,

  // v12: método de execução e agrupamento por grupo (bi-set, circuito, drop-set)
  `ALTER TABLE treino_exercicios ADD COLUMN metodo TEXT NOT NULL DEFAULT 'normal';
   ALTER TABLE treino_exercicios ADD COLUMN grupo_id TEXT;
   ALTER TABLE sessao_exercicios ADD COLUMN metodo TEXT NOT NULL DEFAULT 'normal';
   ALTER TABLE sessao_exercicios ADD COLUMN grupo_id TEXT;`,
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
    const statements = migration
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

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
    ];

    for (const { table, column, type, defaultValue } of required) {
      const info = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
      const exists = info.some((col) => col.name === column);
      if (!exists) {
        const def = defaultValue ? ` NOT NULL DEFAULT ${defaultValue}` : '';
        await database.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}${def};`);
        this.logger.info('database.column_added', { table, column });
      }
    }
  }
}
