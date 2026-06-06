import { describe, it, expect, beforeEach } from 'vitest';
import { ExerciseSeedLoader } from './ExerciseSeedLoader';
import { InMemoryExerciseRepository } from './InMemoryExerciseRepository';

const SEED_FILE_V1 = {
  catalog_version: 1,
  exercises: [
    {
      id: 'test-seed-001',
      name: 'Supino Reto com Barra',
      name_variations: ['Bench Press', 'Supino Reto'],
      group_muscle: 'Peito, Triceps, Ombros',
      category: 'Composto',
      equipment: 'Barra olimpica',
      primary_equipment: 'Barbell',
      secondary_equipment: 'Flat Bench',
      movement_pattern: 'Horizontal Push',
      musculo_alvo: ['peitoral_medio', 'peitoral_esternal'],
      stabilizers: ['rotador_externo', 'serratus_anterior'],
      execution_type: 'Bilateral' as const,
      equivalent_alternatives: [],
      muscle_group_alternatives: [],
    },
  ],
};

describe('ExerciseSeedLoader', () => {
  let repo: InMemoryExerciseRepository;
  let loader: ExerciseSeedLoader;

  beforeEach(() => {
    repo = new InMemoryExerciseRepository();
    loader = new ExerciseSeedLoader(repo);
  });

  it('inserts a new catalog exercise from seed data', async () => {
    await loader.loadSeedFile(SEED_FILE_V1);

    const exercise = await repo.findById('test-seed-001');
    expect(exercise).not.toBeNull();
    expect(exercise!.toPrimitives().movementPattern).toBe('Horizontal Push');
    expect(exercise!.toPrimitives().musculoAlvo).toEqual(['peitoral_medio', 'peitoral_esternal']);
    expect(exercise!.toPrimitives().nameVariations).toEqual(['Bench Press', 'Supino Reto']);
    expect(exercise!.toPrimitives().catalogVersion).toBe(1);
  });

  it('is idempotent — running twice does not duplicate', async () => {
    await loader.loadSeedFile(SEED_FILE_V1);
    await loader.loadSeedFile(SEED_FILE_V1);

    const all = await repo.list();
    expect(all.filter((e) => e.toPrimitives().id === 'test-seed-001')).toHaveLength(1);
  });

  it('updates catalog exercise when version increases', async () => {
    await loader.loadSeedFile(SEED_FILE_V1);

    const v2 = {
      catalog_version: 2,
      exercises: [
        { ...SEED_FILE_V1.exercises[0], movement_pattern: 'Horizontal Pull', musculo_alvo: ['dorsal'] },
      ],
    };
    await loader.loadSeedFile(v2);

    const exercise = await repo.findById('test-seed-001');
    expect(exercise!.toPrimitives().movementPattern).toBe('Horizontal Pull');
    expect(exercise!.toPrimitives().musculoAlvo).toEqual(['dorsal']);
    expect(exercise!.toPrimitives().catalogVersion).toBe(2);
  });

  it('never overwrites user-created exercises (isCustom = true)', async () => {
    const { Exercise } = await import('../../domain/exercises/entities/Exercise');
    const userEx = Exercise.create({
      id: 'test-seed-001',
      name: 'Meu Supino Custom',
      groupMuscle: 'Peito',
      createdAt: new Date(),
      isCustom: true,
    });
    await repo.save(userEx);

    await loader.loadSeedFile(SEED_FILE_V1);

    const after = await repo.findById('test-seed-001');
    expect(after!.toPrimitives().name).toBe('Meu Supino Custom');
    expect(after!.toPrimitives().isCustom).toBe(true);
  });
});
