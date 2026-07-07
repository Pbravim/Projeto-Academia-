/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

import { createTestDatabase } from '../../test/db-setup';
import { SQLiteExerciseRepository } from './SQLiteExerciseRepository';
import { ExerciseSeedLoader, type SeedFile } from './ExerciseSeedLoader';
import { normalizeText } from '../../shared/utils/normalizeText';

// Todos os seeds reais do catálogo — o mesmo conjunto carregado no boot.
const seedModules = import.meta.glob('./seeds/*.json', { eager: true }) as Record<
  string,
  { default: SeedFile }
>;
// O diretório também contém _manifest.json (controle de sessões de pesquisa) — não é um SeedFile.
const seedFiles = Object.values(seedModules)
  .map((m) => m.default)
  .filter((f) => Array.isArray(f.exercises));

function setupDb() {
  const db = createTestDatabase();
  return db;
}

const todasEntradas = seedFiles.flatMap((f) => f.exercises);
const idsCatalogo = new Set(todasEntradas.map((e) => e.id));
const nomesCatalogo = new Set(todasEntradas.map((e) => normalizeText(e.name)));

// A migração v4 real pré-carrega ~40 exercícios (seed-ex-*). Os que o catálogo
// absorve (mesmo id ou mesmo normalized_name) viram linhas do catálogo; os
// demais permanecem como linhas legadas após o load.
async function contarLegadosForaDoCatalogo(db: ReturnType<typeof setupDb>): Promise<number> {
  const preexistentes = await db.getAll<{ id: string; normalized_name: string }>(
    'SELECT id, normalized_name FROM exercises'
  );
  return preexistentes.filter(
    (r) => !idsCatalogo.has(r.id) && !nomesCatalogo.has(r.normalized_name)
  ).length;
}

describe('ExerciseSeedLoader (integração com seeds reais + FK)', () => {
  it('carrega os 22 seeds com um catálogo legado pré-existente (mesmo nome, outro id)', async () => {
    const db = setupDb();
    await db.run('PRAGMA foreign_keys = ON');

    // Simula instalação antiga: uma linha com o nome de um exercício do seed
    // mas id diferente. Escolhe um nome que ainda não exista no banco — o v4
    // real já pré-carrega ~40 exercícios e normalized_name é UNIQUE.
    const nomesExistentes = new Set(
      (await db.getAll<{ normalized_name: string }>('SELECT normalized_name FROM exercises')).map(
        (r) => r.normalized_name
      )
    );
    const primeiro = todasEntradas.find((e) => !nomesExistentes.has(normalizeText(e.name)))!;
    await db.run(
      `INSERT INTO exercises (id, name, normalized_name, group_muscle, category, equipment, load_unit, is_custom, created_at, updated_at)
       VALUES ('legacy-0001', ?, ?, 'Peito', 'Composto', NULL, 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z')`,
      [primeiro.name, normalizeText(primeiro.name)]
    );
    const legados = await contarLegadosForaDoCatalogo(db);

    const repository = new SQLiteExerciseRepository(db);
    const loader = new ExerciseSeedLoader(repository);
    await loader.loadSeedFiles(seedFiles);

    const totalEsperado = seedFiles.reduce((n, f) => n + f.exercises.length, 0);
    const exercicios = await db.getFirst<{ n: number }>('SELECT COUNT(*) as n FROM exercises');
    // a linha legada absorve a entrada do seed — nenhuma duplicata
    // (além do catálogo, só sobram os legados do v4 fora do catálogo)
    expect(exercicios?.n).toBeLessThanOrEqual(totalEsperado + legados + 1);
    const duplicados = await db.getFirst<{ n: number }>(
      'SELECT COUNT(*) as n FROM (SELECT normalized_name FROM exercises GROUP BY normalized_name HAVING COUNT(*) > 1)'
    );
    expect(duplicados?.n).toBe(0);
  });

  it('carrega os 22 seeds do catálogo com foreign_keys ON sem violar FK', async () => {
    // As migrações reais já criam as tabelas de alternativas com REFERENCES
    // e o helper de teste liga foreign_keys=ON — nada a recriar aqui.
    const db = setupDb();
    const legados = await contarLegadosForaDoCatalogo(db);

    const repository = new SQLiteExerciseRepository(db);
    const loader = new ExerciseSeedLoader(repository);

    expect(seedFiles.length).toBeGreaterThanOrEqual(20);
    await loader.loadSeedFiles(seedFiles);

    const totalEsperado = seedFiles.reduce((n, f) => n + f.exercises.length, 0);
    const exercicios = await db.getFirst<{ n: number }>('SELECT COUNT(*) as n FROM exercises');
    expect(exercicios?.n).toBe(totalEsperado + legados);

    const equivalentes = await db.getFirst<{ n: number }>(
      'SELECT COUNT(*) as n FROM exercise_equivalent_alternatives'
    );
    const grupo = await db.getFirst<{ n: number }>(
      'SELECT COUNT(*) as n FROM exercise_muscle_group_alternatives'
    );
    // 1919 referências nos seeds (menos duplicatas exatas via ON CONFLICT DO NOTHING)
    expect((equivalentes?.n ?? 0) + (grupo?.n ?? 0)).toBeGreaterThan(1800);
  });
});
