/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

import { createTestDatabase } from '../../test/db-setup';
import { SQLiteExerciseRepository } from './SQLiteExerciseRepository';
import { ExerciseSeedLoader, type SeedFile } from './ExerciseSeedLoader';

// Todos os seeds reais do catálogo — o mesmo conjunto carregado no boot.
const seedModules = import.meta.glob('./seeds/*.json', { eager: true }) as Record<
  string,
  { default: SeedFile }
>;
// O diretório também contém _manifest.json (controle de sessões de pesquisa) — não é um SeedFile.
const seedFiles = Object.values(seedModules)
  .map((m) => m.default)
  .filter((f) => Array.isArray(f.exercises));

describe('ExerciseSeedLoader (integração com seeds reais + FK)', () => {
  it('carrega os 22 seeds do catálogo com foreign_keys ON sem violar FK', async () => {
    const db = createTestDatabase();

    // O schema de teste omite os REFERENCES; recria as tabelas de alternativas
    // com a MESMA DDL de produção (ExpoSQLiteDatabaseClient) e liga o FK.
    await db.run('DROP TABLE IF EXISTS exercise_equivalent_alternatives');
    await db.run('DROP TABLE IF EXISTS exercise_muscle_group_alternatives');
    await db.run(
      `CREATE TABLE exercise_equivalent_alternatives (
         exercicio_id   TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
         alternativa_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
         PRIMARY KEY (exercicio_id, alternativa_id)
       )`
    );
    await db.run(
      `CREATE TABLE exercise_muscle_group_alternatives (
         exercicio_id   TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
         alternativa_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
         PRIMARY KEY (exercicio_id, alternativa_id)
       )`
    );
    await db.run('PRAGMA foreign_keys = ON');

    const repository = new SQLiteExerciseRepository(db);
    const loader = new ExerciseSeedLoader(repository);

    expect(seedFiles.length).toBeGreaterThanOrEqual(20);
    await loader.loadSeedFiles(seedFiles);

    const totalEsperado = seedFiles.reduce((n, f) => n + f.exercises.length, 0);
    const exercicios = await db.getFirst<{ n: number }>('SELECT COUNT(*) as n FROM exercises');
    expect(exercicios?.n).toBe(totalEsperado);

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
