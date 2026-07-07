/**
 * RODADA 3 — AGENTE B — auditoria de integridade SQLite (ARQUIVO TEMPORÁRIO, NÃO COMMITAR)
 *
 * Monta o schema com as MIGRAÇÕES REAIS de ExpoSQLiteDatabaseClient.ts (v0→v23),
 * com PRAGMA foreign_keys = ON (como em produção), e:
 *  1. faz replay encadeado inserindo dados em versões intermediárias (v18, v21) e
 *     verifica que o rebuild v22 preserva dados + foreign_key_check limpo;
 *  2. roda queries de invariante contra estados produzidos pelos MESMOS SQLs dos
 *     repositórios/use cases (copiados literalmente), provando os caminhos de corrupção.
 */
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeText } from '../shared/utils/normalizeText';

// ---------------------------------------------------------------------------
// Extrai o array real de migrações do source de produção
// ---------------------------------------------------------------------------
const clientSource = readFileSync(
  join(__dirname, '../infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts'),
  'utf-8'
);
const marker = 'const migrations: string[] = [';
const start = clientSource.indexOf(marker);
const end = clientSource.indexOf('\n];', start);
if (start < 0 || end < 0) throw new Error('migrations array não encontrado no source');
const arrayLiteral = clientSource.slice(start + marker.length - 1, end + 2); // '[ ... ]'
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const MIGRATIONS: string[] = new Function(`return ${arrayLiteral};`)();

if (MIGRATIONS.length !== 23) throw new Error(`esperava 23 migrações, achou ${MIGRATIONS.length}`);

// Mesmo splitter semanticamente (respeita aspas) — simplificado
function splitSql(sql: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inStr = false;
  let strCh = '';
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]!;
    if ((ch === "'" || ch === '"') && !inStr) { inStr = true; strCh = ch; }
    else if (inStr && ch === strCh) { inStr = false; }
    cur += ch;
    if (ch === ';' && !inStr) {
      const t = cur.trim().slice(0, -1).trim();
      if (t) out.push(t);
      cur = '';
    }
  }
  const t = cur.trim();
  if (t) out.push(t);
  return out;
}

/** Replica ExpoSQLiteDatabaseClient.runMigrations: FK ON, statement a statement, ignora duplicate column. */
function migrate(db: InstanceType<typeof Database>, upTo: number): void {
  const current = db.pragma('user_version', { simple: true }) as number;
  for (let i = current; i < upTo; i++) {
    for (const stmt of splitSql(MIGRATIONS[i]!)) {
      try {
        db.exec(stmt + ';');
      } catch (err) {
        if (!/duplicate column name/i.test((err as Error).message)) throw err;
      }
    }
    db.pragma(`user_version = ${i + 1}`);
  }
}

function freshDb(): InstanceType<typeof Database> {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON'); // produção: ExpoSQLiteDatabaseClient.ts:744
  return db;
}

function fullDb(): InstanceType<typeof Database> {
  const db = freshDb();
  migrate(db, 23);
  return db;
}

const NOW = '2026-07-06T12:00:00.000Z';

/** Semeia treino+sessão+exercício+séries num banco totalmente migrado (v23). */
function seedSessao(db: InstanceType<typeof Database>, suffix = '1', status = 'finalizada') {
  db.prepare(`INSERT INTO treinos (id, name, created_at, updated_at, dirty) VALUES (?, ?, ?, ?, 1)`)
    .run(`t-${suffix}`, `Treino ${suffix}`, NOW, NOW);
  db.prepare(
    `INSERT INTO treino_exercicios (id, treino_id, exercicio_id, ordem, updated_at, dirty) VALUES (?, ?, 'seed-ex-001', 1, ?, 1)`
  ).run(`te-${suffix}`, `t-${suffix}`, NOW);
  db.prepare(
    `INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, status, updated_at, dirty) VALUES (?, ?, ?, ?, ?, ?, 1)`
  ).run(`st-${suffix}`, `t-${suffix}`, `Treino ${suffix}`, NOW, status, NOW);
  db.prepare(
    `INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot, realizado, updated_at, dirty) VALUES (?, ?, 'seed-ex-001', 1, 'Supino', 'Peito', 'Composto', 1, ?, 1)`
  ).run(`se-${suffix}`, `st-${suffix}`, NOW);
  db.prepare(
    `INSERT INTO series_registradas (id, sessao_exercicio_id, ordem, carga_kg, repeticoes, updated_at, dirty) VALUES (?, ?, 1, 60, 10, ?, 1)`
  ).run(`sr-${suffix}`, `se-${suffix}`, NOW);
}

// ---------------------------------------------------------------------------
// QUERIES DE INVARIANTE (reutilizáveis na Fase 3)
// ---------------------------------------------------------------------------
export const INVARIANTS = {
  seriesOrfas: `
    SELECT sr.id FROM series_registradas sr
    WHERE sr.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM sessao_exercicios se WHERE se.id = sr.sessao_exercicio_id AND se.deleted_at IS NULL)`,
  sessaoExerciciosSemSessao: `
    SELECT se.id FROM sessao_exercicios se
    WHERE se.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM sessao_treinos st WHERE st.id = se.sessao_treino_id AND st.deleted_at IS NULL)`,
  ordemDuplicadaTreinoExercicios: `
    SELECT treino_id, ordem, COUNT(*) n FROM treino_exercicios
    WHERE deleted_at IS NULL GROUP BY treino_id, ordem HAVING n > 1`,
  ordemDuplicadaSeries: `
    SELECT sessao_exercicio_id, ordem, COUNT(*) n FROM series_registradas
    WHERE deleted_at IS NULL GROUP BY sessao_exercicio_id, ordem HAVING n > 1`,
  tombstoneSessaoComFilhosVivos: `
    SELECT st.id FROM sessao_treinos st
    WHERE st.deleted_at IS NOT NULL
      AND EXISTS (SELECT 1 FROM sessao_exercicios se WHERE se.sessao_treino_id = st.id AND se.deleted_at IS NULL)`,
  tombstoneTreinoComFilhosVivos: `
    SELECT t.id FROM treinos t
    WHERE t.deleted_at IS NOT NULL
      AND EXISTS (SELECT 1 FROM treino_exercicios te WHERE te.treino_id = t.id AND te.deleted_at IS NULL)`,
  normalizedNameDivergente: `SELECT id, name, normalized_name FROM exercises WHERE deleted_at IS NULL`,
  alternativaParaExercicioTombstoned: `
    SELECT ea.exercicio_id, ea.alternativa_id FROM exercise_alternatives ea
    WHERE ea.deleted_at IS NULL
      AND EXISTS (SELECT 1 FROM exercises e WHERE e.id IN (ea.exercicio_id, ea.alternativa_id) AND e.deleted_at IS NOT NULL)`,
  planoApontaTreinoMorto: `
    SELECT p.dia_semana, p.treino_id FROM plano_semanal p
    WHERE p.treino_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM treinos t WHERE t.id = p.treino_id AND t.deleted_at IS NULL)`,
};

// ===========================================================================
// PARTE 2 — REPLAY DE MIGRAÇÕES v0→v23
// ===========================================================================
describe('replay de migrações v0→v23 (schema real, FK ON)', () => {
  it('migra banco vazio até v23 com foreign_key_check limpo e índices parciais criados', () => {
    const db = fullDb();
    expect(db.pragma('user_version', { simple: true })).toBe(23);
    expect(db.pragma('foreign_key_check')).toEqual([]);
    expect(db.pragma('integrity_check', { simple: true })).toBe('ok');
    const idx = db.prepare(`SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%_dirty'`).all() as { name: string }[];
    expect(idx.map((r) => r.name).sort()).toEqual([
      'idx_exercises_dirty', 'idx_registros_peso_dirty', 'idx_series_registradas_dirty',
      'idx_sessao_exercicios_dirty', 'idx_sessao_treinos_dirty', 'idx_treino_exercicios_dirty', 'idx_treinos_dirty',
    ].sort());
    db.close();
  });

  it('dados inseridos em v18 (pré-sync) e v21 (pré-rebuild) sobrevivem ao rebuild v22', () => {
    const db = freshDb();
    migrate(db, 18);
    // dados "de dispositivo antigo" — série com carga NOT NULL (schema v18)
    db.prepare(`INSERT INTO treinos (id, name, created_at, updated_at) VALUES ('t-old', 'Peito A', ?, ?)`).run(NOW, NOW);
    db.prepare(`INSERT INTO treino_exercicios (id, treino_id, exercicio_id, ordem) VALUES ('te-old', 't-old', 'seed-ex-001', 1)`).run();
    db.prepare(`INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, status) VALUES ('st-old', 't-old', 'Peito A', ?, 'finalizada')`).run(NOW);
    db.prepare(`INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot, realizado) VALUES ('se-old', 'st-old', 'seed-ex-001', 1, 'Supino', 'Peito', 'Composto', 1)`).run();
    db.prepare(`INSERT INTO series_registradas (id, sessao_exercicio_id, ordem, carga_kg, repeticoes, observacao) VALUES ('sr-old', 'se-old', 1, 80.5, 8, 'pr!')`).run();
    db.prepare(`INSERT INTO registros_peso (id, peso_kg, data_registro) VALUES ('rp-old', 82.3, ?)`).run(NOW);

    migrate(db, 21);
    db.prepare(`INSERT INTO series_registradas (id, sessao_exercicio_id, ordem, carga_kg, repeticoes, updated_at, dirty) VALUES ('sr-v21', 'se-old', 2, 90, 5, ?, 1)`).run(NOW);

    migrate(db, 23);
    expect(db.pragma('user_version', { simple: true })).toBe(23);

    const s1 = db.prepare(`SELECT * FROM series_registradas WHERE id = 'sr-old'`).get() as Record<string, unknown>;
    expect(s1).toMatchObject({ carga_kg: 80.5, repeticoes: 8, observacao: 'pr!', tipo_serie: 'valida', dirty: 1 });
    const s2 = db.prepare(`SELECT * FROM series_registradas WHERE id = 'sr-v21'`).get() as Record<string, unknown>;
    expect(s2).toMatchObject({ carga_kg: 90, repeticoes: 5 });

    // pós-v22, série sem carga (cardio) agora insere
    db.prepare(`INSERT INTO series_registradas (id, sessao_exercicio_id, ordem, duracao_segundos, updated_at, dirty) VALUES ('sr-cardio', 'se-old', 3, 600, ?, 1)`).run(NOW);
    expect(db.pragma('foreign_key_check')).toEqual([]);
    db.close();
  });

  it('ACHADO: crash entre DROP e RENAME na v22 deixa o banco irreparável no próximo boot', () => {
    const db = freshDb();
    migrate(db, 21);
    // simula crash: executa v22 até o DROP TABLE, sem o RENAME
    const stmts = splitSql(MIGRATIONS[21]!);
    const dropIdx = stmts.findIndex((s) => /DROP TABLE series_registradas/.test(s));
    for (let i = 0; i <= dropIdx; i++) db.exec(stmts[i]! + ';');
    // user_version continua 21 → próximo boot re-executa a v22 inteira
    expect(() => migrate(db, 23)).toThrow(/already exists/);
    // o runner de produção só engole "duplicate column name" → app não abre mais
    db.close();
  });
});

// ===========================================================================
// PARTE 1 — INVARIANTES + caminhos de código que as violam
// ===========================================================================
describe('invariantes de integridade', () => {
  it('BASELINE: banco recém-migrado satisfaz todas as invariantes (exceto normalized_name — ver teste próprio)', () => {
    const db = fullDb();
    for (const [name, sql] of Object.entries(INVARIANTS)) {
      if (name === 'normalizedNameDivergente') continue;
      expect(db.prepare(sql).all(), name).toEqual([]);
    }
    db.close();
  });

  it('normalized_name dos seeds das migrações vs normalizeText(name)', () => {
    const db = fullDb();
    const rows = db.prepare(INVARIANTS.normalizedNameDivergente).all() as { id: string; name: string; normalized_name: string }[];
    const divergentes = rows.filter((r) => normalizeText(r.name) !== r.normalized_name);
    // evidência: lista qualquer seed cujo normalized_name gravado difere do runtime
    console.log('normalized_name divergentes:', JSON.stringify(divergentes));
    expect(divergentes).toEqual([]);
    db.close();
  });

  it('ACHADO P0: INSERT OR REPLACE em exercises (save/applyServerRows) dispara ON DELETE CASCADE e apaga as 3 tabelas de alternativas', () => {
    const db = fullDb();
    // vínculos de alternativas do seed-ex-001 (exatamente como addAlternativa/addEquivalentAlternativa gravam)
    db.prepare(`INSERT INTO exercise_alternatives (exercicio_id, alternativa_id, updated_at, dirty) VALUES ('seed-ex-001', 'seed-ex-004', ?, 1)`).run(NOW);
    db.prepare(`INSERT INTO exercise_equivalent_alternatives (exercicio_id, alternativa_id) VALUES ('seed-ex-001', 'seed-ex-004')`).run();
    db.prepare(`INSERT INTO exercise_muscle_group_alternatives (exercicio_id, alternativa_id) VALUES ('seed-ex-001', 'seed-ex-002')`).run();

    // SQL LITERAL de SQLiteExerciseRepository.save() (linhas 41-47) — ex.: usuário edita o exercício
    db.prepare(
      `INSERT OR REPLACE INTO exercises (
         id, name, normalized_name, group_muscle, category, equipment,
         load_unit, is_custom, created_at, updated_at, media_online, media_local,
         musculo_alvo, movement_pattern, stabilizers, execution_type,
         name_variations, primary_equipment, secondary_equipment, catalog_version,
         tracking_type, deleted_at, dirty
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1)`
    ).run('seed-ex-001', 'Supino Reto com Barra EDITADO', 'supino reto com barra editado',
      'Peito', 'Composto', 'Barra olimpica', 'kg', 0, NOW, NOW, null, null, '[]', null, '[]', null, '[]', null, null, 0, 'reps_load');

    const alt = db.prepare(`SELECT COUNT(*) n FROM exercise_alternatives WHERE exercicio_id = 'seed-ex-001' OR alternativa_id = 'seed-ex-001'`).get() as { n: number };
    const eq = db.prepare(`SELECT COUNT(*) n FROM exercise_equivalent_alternatives WHERE exercicio_id = 'seed-ex-001'`).get() as { n: number };
    const mg = db.prepare(`SELECT COUNT(*) n FROM exercise_muscle_group_alternatives WHERE exercicio_id = 'seed-ex-001'`).get() as { n: number };
    console.log(`pós-REPLACE: exercise_alternatives=${alt.n}, equivalent=${eq.n}, muscle_group=${mg.n}`);
    // BUG comprovado se zerou:
    expect(alt.n).toBe(0);
    expect(eq.n).toBe(0);
    expect(mg.n).toBe(0);
    db.close();
  });

  it('comportamento de REPLACE em pai com filhos FK sem cascade (sessao_exercicios ← series_registradas)', () => {
    const db = fullDb();
    seedSessao(db);
    // SQL literal de SQLiteSessaoExercicioRepository.save() — ex.: ToggleExercicioRealizado / atualizarCargaSeNecessario
    let outcome = 'ok';
    try {
      db.prepare(
        `INSERT OR REPLACE INTO sessao_exercicios
          (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot, equipamento_snapshot, musculo_alvo_snapshot, movement_pattern_snapshot, realizado, series_recomendadas, execucoes_recomendadas, carga_padrao, tempo_descanso_segundos, metodo, grupo_id, tracking_type_snapshot, duracao_recomendada_segundos, distancia_recomendada_metros, intensidade_recomendada, substituido_por_exercicio_id, substituicao_motivo, nome_original_snapshot, updated_at, deleted_at, dirty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1)`
      ).run('se-1', 'st-1', 'seed-ex-001', 1, 'Supino', 'Peito', 'Composto', null, '[]', null, 0,
        null, null, 70, null, 'normal', null, 'reps_load', null, null, null, null, null, null, NOW);
    } catch (err) {
      outcome = (err as Error).message;
    }
    console.log('REPLACE pai com filho FK vivo →', outcome);
    // série continua presente e não órfã?
    const sr = db.prepare(`SELECT COUNT(*) n FROM series_registradas WHERE sessao_exercicio_id = 'se-1'`).get() as { n: number };
    console.log('séries após REPLACE do pai:', sr.n);
    expect(db.pragma('foreign_key_check')).toEqual([]);
    db.close();
  });

  it('ACHADO P1: getDirty/applyServerRows de sessao_treinos, sessao_exercicios e registros_peso referenciam created_at inexistente', () => {
    const db = fullDb();
    // SQL literal de SQLiteSessaoTreinoRepository.getDirty() (linhas 62-64)
    expect(() => db.prepare(
      `SELECT id, treino_id, treino_nome_snapshot, data_hora_inicio, data_hora_fim,
              status, arquivado, created_at, updated_at, deleted_at
       FROM sessao_treinos WHERE dirty = 1`).all()).toThrow(/no such column.*created_at/i);
    // SQL literal de SQLiteSessaoExercicioRepository.getDirty() (linhas 108-115)
    expect(() => db.prepare(
      `SELECT id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot,
              categoria_snapshot, equipamento_snapshot, musculo_alvo_snapshot, movement_pattern_snapshot, nome_original_snapshot,
              realizado, series_recomendadas, execucoes_recomendadas, carga_padrao, tempo_descanso_segundos,
              metodo, grupo_id, tracking_type_snapshot, duracao_recomendada_segundos, distancia_recomendada_metros, intensidade_recomendada,
              substituido_por_exercicio_id, substituicao_motivo,
              created_at, updated_at, deleted_at
       FROM sessao_exercicios WHERE dirty = 1`).all()).toThrow(/no such column.*created_at/i);
    // SQL literal de SQLiteRegistroPesoRepository.getDirty() (linha 52)
    expect(() => db.prepare(
      `SELECT id, peso_kg, data_registro, observacao, created_at, updated_at, deleted_at
       FROM registros_peso WHERE dirty = 1`).all()).toThrow(/no such column.*created_at/i);
    // applyServerRows de sessao_treinos (linhas 77-80) — INSERT em coluna inexistente
    expect(() => db.prepare(
      `INSERT OR REPLACE INTO sessao_treinos
         (id, treino_id, treino_nome_snapshot, data_hora_inicio, data_hora_fim,
          status, arquivado, created_at, updated_at, deleted_at, dirty, server_rev)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`)).toThrow(/no column named created_at/i);
    db.close();
  });

  it('ACHADO P1: AddExercicioAoTreino usa COUNT+1 → ordem duplicada viva após remover exercício do meio', () => {
    const db = fullDb();
    db.prepare(`INSERT INTO treinos (id, name, created_at, updated_at) VALUES ('t-1', 'A', ?, ?)`).run(NOW, NOW);
    const ins = db.prepare(`INSERT INTO treino_exercicios (id, treino_id, exercicio_id, ordem, updated_at, dirty) VALUES (?, 't-1', ?, ?, ?, 1)`);
    ins.run('te-a', 'seed-ex-001', 1, NOW);
    ins.run('te-b', 'seed-ex-002', 2, NOW);
    ins.run('te-c', 'seed-ex-003', 3, NOW);
    // RemoveExercicioDoTreino → SQLiteTreinoExercicioRepository.delete (linha 105): soft-delete do primeiro
    db.prepare(`UPDATE treino_exercicios SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = 'te-a'`).run(NOW, NOW);
    // AddExercicioAoTreinoUseCase.ts:48-53 — countByTreinoId (só vivos) + 1
    const count = (db.prepare(`SELECT COUNT(*) n FROM treino_exercicios WHERE treino_id = 't-1' AND deleted_at IS NULL`).get() as { n: number }).n;
    ins.run('te-d', 'seed-ex-004', count + 1, NOW); // ordem = 3, colide com te-c
    const dupes = db.prepare(INVARIANTS.ordemDuplicadaTreinoExercicios).all();
    console.log('ordens duplicadas vivas:', JSON.stringify(dupes));
    expect(dupes.length).toBeGreaterThan(0);
    db.close();
  });

  it('ACHADO P2: re-adicionar exercício removido REPLACEa o tombstone via UNIQUE(treino_id, exercicio_id) — deleção nunca chega ao servidor', () => {
    const db = fullDb();
    db.prepare(`INSERT INTO treinos (id, name, created_at, updated_at) VALUES ('t-1', 'A', ?, ?)`).run(NOW, NOW);
    // exercício adicionado, sincronizado (server_rev=7, dirty=0) e depois removido (tombstone dirty=1 pendente de push)
    db.prepare(`INSERT INTO treino_exercicios (id, treino_id, exercicio_id, ordem, updated_at, deleted_at, dirty, server_rev) VALUES ('te-old', 't-1', 'seed-ex-001', 1, ?, ?, 1, 7)`).run(NOW, NOW);
    // usuário re-adiciona: SQLiteTreinoExercicioRepository.save() (INSERT OR REPLACE, linha 29) com id novo
    db.prepare(
      `INSERT OR REPLACE INTO treino_exercicios (id, treino_id, exercicio_id, ordem, series_recomendadas, execucoes_recomendadas, carga_padrao, tempo_descanso_segundos, metodo, grupo_id, duracao_recomendada_segundos, distancia_recomendada_metros, intensidade_recomendada, updated_at, deleted_at, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1)`
    ).run('te-new', 't-1', 'seed-ex-001', 1, null, null, null, null, 'normal', null, null, null, null, NOW);
    const tombstone = db.prepare(`SELECT COUNT(*) n FROM treino_exercicios WHERE id = 'te-old'`).get() as { n: number };
    console.log('tombstone te-old sobreviveu?', tombstone.n);
    expect(tombstone.n).toBe(0); // tombstone destruído antes do sync → servidor mantém a linha viva
    db.close();
  });

  it('ACHADO P1: DeleteTreinoUseCase tombstona sessões mas deixa sessao_exercicios/séries vivos (tombstone com filhos vivos)', () => {
    const db = fullDb();
    seedSessao(db, '1');
    // sequência literal de DeleteTreinoUseCase.ts:27-30 com os SQLs dos repositórios:
    db.prepare(`UPDATE sessao_treinos SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE treino_id = 't-1' AND deleted_at IS NULL`).run(NOW, NOW); // SQLiteSessaoTreinoRepository.ts:51
    db.prepare(`UPDATE treino_exercicios SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE treino_id = 't-1' AND deleted_at IS NULL`).run(NOW, NOW); // SQLiteTreinoExercicioRepository.ts:109
    db.prepare(`UPDATE treinos SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = 't-1'`).run(NOW, NOW); // SQLiteTreinoRepository.ts:48
    // (bootstrap NÃO injeta planoSemanalRepository nem database → sem clearTreino e sem transação)

    const violA = db.prepare(INVARIANTS.tombstoneSessaoComFilhosVivos).all();
    const violB = db.prepare(INVARIANTS.sessaoExerciciosSemSessao).all();
    console.log('sessões tombstoned com filhos vivos:', JSON.stringify(violA), '| se órfãos vivos:', JSON.stringify(violB));
    expect(violA.length).toBeGreaterThan(0);
    expect(violB.length).toBeGreaterThan(0);
    db.close();
  });

  it('ACHADO P1: plano_semanal segue apontando para treino tombstoned (SET NULL não dispara em soft-delete; bootstrap omite clearTreino)', () => {
    const db = fullDb();
    db.prepare(`INSERT INTO treinos (id, name, created_at, updated_at) VALUES ('t-1', 'A', ?, ?)`).run(NOW, NOW);
    db.prepare(`UPDATE plano_semanal SET treino_id = 't-1' WHERE dia_semana = 'seg'`).run();
    db.prepare(`UPDATE treinos SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = 't-1'`).run(NOW, NOW);
    const viol = db.prepare(INVARIANTS.planoApontaTreinoMorto).all();
    console.log('plano_semanal → treino morto:', JSON.stringify(viol));
    expect(viol.length).toBeGreaterThan(0);
    db.close();
  });

  it('ACHADO P1: removeAlternativa é inócuo — listAlternativas não filtra ea.deleted_at', () => {
    const db = fullDb();
    db.prepare(`INSERT INTO exercise_alternatives (exercicio_id, alternativa_id, updated_at, dirty) VALUES ('seed-ex-001', 'seed-ex-004', ?, 1)`).run(NOW);
    // removeAlternativa (SQLiteExerciseRepository.ts:172)
    db.prepare(`UPDATE exercise_alternatives SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE exercicio_id = 'seed-ex-001' AND alternativa_id = 'seed-ex-004'`).run(NOW, NOW);
    // listAlternativas (SQLiteExerciseRepository.ts:150-157) — SQL literal
    const rows = db.prepare(
      `SELECT e.id FROM exercises e
       JOIN exercise_alternatives ea ON ea.alternativa_id = e.id
       WHERE ea.exercicio_id = 'seed-ex-001' AND e.deleted_at IS NULL
       ORDER BY e.name ASC`).all();
    console.log('alternativas listadas após remoção:', JSON.stringify(rows));
    expect(rows.length).toBe(1); // BUG: alternativa removida continua listada
    db.close();
  });

  it('ACHADO P2: DeleteExerciseUseCase não tombstona exercise_alternatives → vínculos vivos apontando para exercício tombstoned', () => {
    const db = fullDb();
    db.prepare(`INSERT INTO exercise_alternatives (exercicio_id, alternativa_id, updated_at, dirty) VALUES ('seed-ex-002', 'seed-ex-001', ?, 1)`).run(NOW);
    // DeleteExerciseUseCase.ts:36-41: tombstona treino_exercicios, séries, sessao_exercicios e o exercício — mas não ea
    db.prepare(`UPDATE exercises SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = 'seed-ex-001'`).run(NOW, NOW); // SQLiteExerciseRepository.ts:128
    const viol = db.prepare(INVARIANTS.alternativaParaExercicioTombstoned).all();
    console.log('ea vivos → exercício tombstoned:', JSON.stringify(viol));
    expect(viol.length).toBeGreaterThan(0);
    db.close();
  });

  it('ACHADO P1: ResetHistorico faz DELETE físico (sem tombstone p/ sync) e não limpa sessões canceladas', () => {
    const db = fullDb();
    seedSessao(db, 'fin', 'finalizada');
    seedSessao(db, 'can', 'cancelada');
    // marca como já sincronizadas (existem no servidor)
    db.prepare(`UPDATE sessao_treinos SET dirty = 0, server_rev = 3`).run();
    db.prepare(`UPDATE sessao_exercicios SET dirty = 0, server_rev = 3`).run();
    db.prepare(`UPDATE series_registradas SET dirty = 0, server_rev = 3`).run();

    // SQL literal de ResetHistoricoUseCase.ts:14-30
    db.prepare(`DELETE FROM series_registradas WHERE sessao_exercicio_id IN (
      SELECT se.id FROM sessao_exercicios se INNER JOIN sessao_treinos st ON se.sessao_treino_id = st.id
      WHERE st.status = 'finalizada')`).run();
    db.prepare(`DELETE FROM sessao_exercicios WHERE sessao_treino_id IN (SELECT id FROM sessao_treinos WHERE status = 'finalizada')`).run();
    db.prepare(`DELETE FROM sessao_treinos WHERE status = 'finalizada'`).run();

    const canceladas = db.prepare(`SELECT COUNT(*) n FROM sessao_treinos WHERE status = 'cancelada'`).get() as { n: number };
    const tombstones = db.prepare(`SELECT COUNT(*) n FROM sessao_treinos WHERE deleted_at IS NOT NULL`).get() as { n: number };
    console.log(`pós-reset: canceladas restantes=${canceladas.n}, tombstones p/ push=${tombstones.n}`);
    expect(canceladas.n).toBe(1);   // cancelada + filhos ficam para sempre
    expect(tombstones.n).toBe(0);   // nada a enviar ao servidor → backup ressuscita o histórico no próximo pull
    db.close();
  });

  it('ACHADO P2: SqliteDashboardRepository.deletarSessao apaga fisicamente sessão sincronizada — mesmo problema de ressurreição', () => {
    const db = fullDb();
    seedSessao(db);
    db.prepare(`UPDATE sessao_treinos SET dirty = 0, server_rev = 9 WHERE id = 'st-1'`).run();
    // SQL literal de SqliteDashboardRepository.ts:284-290
    db.prepare(`DELETE FROM series_registradas WHERE sessao_exercicio_id IN ('se-1')`).run();
    db.prepare(`DELETE FROM sessao_exercicios WHERE sessao_treino_id = 'st-1'`).run();
    db.prepare(`DELETE FROM sessao_treinos WHERE id = 'st-1'`).run();
    const tomb = db.prepare(`SELECT COUNT(*) n FROM sessao_treinos WHERE id = 'st-1'`).get() as { n: number };
    expect(tomb.n).toBe(0); // sem tombstone → servidor mantém a sessão e a devolve no pull
    db.close();
  });

  it('ACHADO P2: arquivarSessao não seta dirty/updated_at → mudança nunca sincroniza', () => {
    const db = fullDb();
    seedSessao(db);
    db.prepare(`UPDATE sessao_treinos SET dirty = 0, server_rev = 2 WHERE id = 'st-1'`).run();
    // SQL literal de SqliteDashboardRepository.ts:268
    db.prepare(`UPDATE sessao_treinos SET arquivado = 1 WHERE id = 'st-1'`).run();
    const row = db.prepare(`SELECT dirty FROM sessao_treinos WHERE id = 'st-1'`).get() as { dirty: number };
    expect(row.dirty).toBe(0); // continua limpo → getDirty nunca envia o arquivamento
    db.close();
  });

  it('ACHADO P2: pull do sync insere filhos antes dos pais (Promise.all) → FK imediata aborta a transação', () => {
    const db = fullDb();
    // dentro da transação do SyncEngine.applyAll, a ordem entre tabelas não é determinística;
    // se uma série chega antes do sessao_exercicio pai:
    db.exec('BEGIN');
    let failed = '';
    try {
      db.prepare(`INSERT OR REPLACE INTO series_registradas
        (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes, observacao, duracao_segundos, distancia_metros, intensidade, updated_at, deleted_at, dirty, server_rev)
        VALUES ('sr-x', 'se-nao-existe-ainda', 'valida', 1, 50, 10, NULL, NULL, NULL, NULL, ?, NULL, 0, 1)`).run(NOW);
    } catch (err) {
      failed = (err as Error).message;
    }
    db.exec('ROLLBACK');
    console.log('insert filho antes do pai →', failed || 'OK (sem erro)');
    expect(failed).toMatch(/FOREIGN KEY/i);
    db.close();
  });

  it('ACHADO P3: OrphanCleanupService consulta tabela inexistente `exercicios` (e o serviço nem está registrado no bootstrap)', () => {
    const db = fullDb();
    // SQL literal de OrphanCleanupService.ts:24
    expect(() => db.prepare(`DELETE FROM exercise_alternatives WHERE exercicio_id NOT IN (SELECT id FROM exercicios)`).run())
      .toThrow(/no such table.*exercicios/i);
    db.close();
  });

  it('OK: RegistrarSerie usa MAX(ordem)+1 incluindo soft-deletadas — sem ordem duplicada em séries', () => {
    const db = fullDb();
    seedSessao(db);
    db.prepare(`INSERT INTO series_registradas (id, sessao_exercicio_id, ordem, carga_kg, repeticoes, updated_at, dirty) VALUES ('sr-2', 'se-1', 2, 60, 10, ?, 1)`).run(NOW);
    // deleta a do meio (soft) e registra nova — maxOrdemBySessaoExercicioId inclui deletadas (SQLiteSerieRegistradaRepository.ts:65-73)
    db.prepare(`UPDATE series_registradas SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = 'sr-1'`).run(NOW, NOW);
    const max = (db.prepare(`SELECT MAX(ordem) m FROM series_registradas WHERE sessao_exercicio_id = 'se-1'`).get() as { m: number }).m;
    db.prepare(`INSERT INTO series_registradas (id, sessao_exercicio_id, ordem, carga_kg, repeticoes, updated_at, dirty) VALUES ('sr-3', 'se-1', ?, 65, 10, ?, 1)`).run(max + 1, NOW);
    expect(db.prepare(INVARIANTS.ordemDuplicadaSeries).all()).toEqual([]);
    db.close();
  });
});
