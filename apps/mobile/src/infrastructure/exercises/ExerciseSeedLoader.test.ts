import { beforeEach,describe, expect, it } from 'vitest';

import { Exercise } from '../../domain/exercises/entities/Exercise';
import { normalizeText } from '../../shared/utils/normalizeText';

import { ExerciseSeedLoader, type SeedExerciseEntry } from './ExerciseSeedLoader';
import { InMemoryExerciseRepository } from './InMemoryExerciseRepository';

function legacyExercise(id: string, name: string, isCustom = false): Exercise {
  return Exercise.restore({
    id,
    name,
    normalizedName: normalizeText(name),
    groupMuscles: ['Peito'],
    category: 'Composto',
    equipment: null,
    loadUnit: 'kg',
    isCustom,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    mediaOnline: null,
    mediaLocal: null,
    musculoAlvo: [],
    movementPattern: null,
    stabilizers: [],
    executionType: null,
    nameVariations: [],
    primaryEquipment: null,
    secondaryEquipment: null,
    catalogVersion: 0,
    trackingType: 'reps_load',
  });
}

const SEED_FILE_V1 = {
  catalog_version: 1,
  exercises: [
    {
      id: 'test-seed-001',
      name: 'Supino Reto com Barra',
      name_variations: ['Bench Press', 'Supino Reto'],
      group_muscles: ['Peito', 'Triceps', 'Ombros'],
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
      tracking_type: 'reps_load' as const,
    },
  ],
};

function entry(id: string, overrides: Partial<SeedExerciseEntry> = {}): SeedExerciseEntry {
  return {
    ...SEED_FILE_V1.exercises[0],
    id,
    name: `Exercicio ${id}`,
    equivalent_alternatives: [],
    muscle_group_alternatives: [],
    ...overrides,
  };
}

/**
 * Simula as constraints do SQLite de produção:
 * - FK: alternativa só pode apontar para exercício já inserido;
 * - UNIQUE(normalized_name) com upsert de duas cláusulas
 *   (ON CONFLICT(id) / ON CONFLICT(normalized_name), ambas WHERE is_custom = 0).
 */
class FkEnforcingRepository extends InMemoryExerciseRepository {
  override async addEquivalentAlternativa(exercicioId: string, alternativaId: string): Promise<void> {
    if (!(await this.findById(alternativaId))) throw new Error('FOREIGN KEY constraint failed');
    await super.addEquivalentAlternativa(exercicioId, alternativaId);
  }
  override async addMuscleGroupAlternativa(exercicioId: string, alternativaId: string): Promise<void> {
    if (!(await this.findById(alternativaId))) throw new Error('FOREIGN KEY constraint failed');
    await super.addMuscleGroupAlternativa(exercicioId, alternativaId);
  }
  override async upsertCatalogExercise(exercise: Exercise, equivalentIds: string[], muscleGroupIds: string[]): Promise<void> {
    const p = exercise.toPrimitives();
    const byId = await this.findById(p.id);
    if (byId) {
      if (byId.toPrimitives().isCustom) return; // ON CONFLICT(id) ... WHERE is_custom = 0
    } else {
      const byName = await this.findByNormalizedName(p.normalizedName);
      if (byName && byName.toPrimitives().id !== p.id) {
        // ON CONFLICT(normalized_name) DO UPDATE ... WHERE is_custom = 0
        const bp = byName.toPrimitives();
        if (!bp.isCustom) await this.save(Exercise.restore({ ...p, id: bp.id }));
        return;
      }
    }
    await super.upsertCatalogExercise(exercise, equivalentIds, muscleGroupIds);
  }
}

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
      groupMuscles: ['Peito'],
      createdAt: new Date(),
      isCustom: true,
    });
    await repo.save(userEx);

    await loader.loadSeedFile(SEED_FILE_V1);

    const after = await repo.findById('test-seed-001');
    expect(after!.toPrimitives().name).toBe('Meu Supino Custom');
    expect(after!.toPrimitives().isCustom).toBe(true);
  });

  it('loads tracking_type from seed entry when present', async () => {
    const cardioSeed = {
      catalog_version: 1,
      exercises: [
        {
          id: 'test-seed-cardio-001',
          name: 'Esteira Steady State',
          name_variations: ['Treadmill'],
          group_muscles: ['Cardio'],
          category: 'Cardio',
          equipment: 'Esteira',
          primary_equipment: null,
          secondary_equipment: null,
          movement_pattern: 'Gait',
          musculo_alvo: [],
          stabilizers: [],
          execution_type: null,
          equivalent_alternatives: [],
          muscle_group_alternatives: [],
          tracking_type: 'cardio' as const,
        },
      ],
    };

    await loader.loadSeedFile(cardioSeed);

    const exercise = await repo.findById('test-seed-cardio-001');
    expect(exercise).not.toBeNull();
    expect(exercise!.toPrimitives().trackingType).toBe('cardio');
  });

  it('loads forward and cross-file alternativa refs without violating FK (two-phase)', async () => {
    const fkRepo = new FkEnforcingRepository();
    const fkLoader = new ExerciseSeedLoader(fkRepo);

    const fileA = {
      catalog_version: 1,
      exercises: [
        // ex1 referencia ex2 (mais adiante no MESMO arquivo) e ex3 (em OUTRO arquivo)
        entry('test-ex-1', { equivalent_alternatives: ['test-ex-2'], muscle_group_alternatives: ['test-ex-3'] }),
        entry('test-ex-2'),
      ],
    };
    const fileB = {
      catalog_version: 1,
      exercises: [entry('test-ex-3')],
    };

    await fkLoader.loadSeedFiles([fileA, fileB]);

    expect(await fkRepo.findById('test-ex-1')).not.toBeNull();
    expect(await fkRepo.findById('test-ex-2')).not.toBeNull();
    expect(await fkRepo.findById('test-ex-3')).not.toBeNull();
    const equivalentes = await fkRepo.listEquivalentAlternativas('test-ex-1');
    expect(equivalentes.map((e) => e.toPrimitives().id)).toEqual(['test-ex-2']);
    const grupo = await fkRepo.listMuscleGroupAlternativas('test-ex-1');
    expect(grupo.map((e) => e.toPrimitives().id)).toEqual(['test-ex-3']);
  });

  it('skips dangling alternativa refs (target id in no seed file) without failing', async () => {
    const fkRepo = new FkEnforcingRepository();
    const fkLoader = new ExerciseSeedLoader(fkRepo);

    const file = {
      catalog_version: 1,
      exercises: [
        entry('test-ex-1', { equivalent_alternatives: ['test-fantasma', 'test-ex-2'] }),
        entry('test-ex-2'),
      ],
    };

    await fkLoader.loadSeedFiles([file]);

    const equivalentes = await fkRepo.listEquivalentAlternativas('test-ex-1');
    expect(equivalentes.map((e) => e.toPrimitives().id)).toEqual(['test-ex-2']);
  });

  it('reuses the existing row when the name already exists under another id (legacy catalog)', async () => {
    const fkRepo = new FkEnforcingRepository();
    const fkLoader = new ExerciseSeedLoader(fkRepo);
    await fkRepo.save(legacyExercise('legacy-1', 'Exercicio test-ex-1'));

    const file = {
      catalog_version: 2,
      exercises: [
        entry('test-ex-1', { movement_pattern: 'Hinge' }),
        entry('test-ex-2', { equivalent_alternatives: ['test-ex-1'] }),
      ],
    };
    await fkLoader.loadSeedFiles([file]);

    // não cria linha nova com o id do seed; atualiza a linha legada no lugar
    expect(await fkRepo.findById('test-ex-1')).toBeNull();
    expect((await fkRepo.findById('legacy-1'))!.toPrimitives().movementPattern).toBe('Hinge');
    // referências ao id do seed são remapeadas para o id legado
    const eq = await fkRepo.listEquivalentAlternativas('test-ex-2');
    expect(eq.map((e) => e.toPrimitives().id)).toEqual(['legacy-1']);
  });

  it('does not overwrite a custom exercise that holds the same name; refs resolve to it', async () => {
    const fkRepo = new FkEnforcingRepository();
    const fkLoader = new ExerciseSeedLoader(fkRepo);
    await fkRepo.save(legacyExercise('custom-1', 'Exercicio test-ex-1', true));

    const file = {
      catalog_version: 2,
      exercises: [
        entry('test-ex-1', { movement_pattern: 'Hinge' }),
        entry('test-ex-2', { equivalent_alternatives: ['test-ex-1'] }),
      ],
    };
    await fkLoader.loadSeedFiles([file]);

    const custom = (await fkRepo.findById('custom-1'))!.toPrimitives();
    expect(custom.isCustom).toBe(true);
    expect(custom.movementPattern).toBeNull();
    expect(await fkRepo.findById('test-ex-1')).toBeNull();
    const eq = await fkRepo.listEquivalentAlternativas('test-ex-2');
    expect(eq.map((e) => e.toPrimitives().id)).toEqual(['custom-1']);
  });

  it('defaults to reps_load when tracking_type is not specified', async () => {
    const noTrackingTypeSeed = {
      catalog_version: 1,
      exercises: [
        {
          id: 'test-seed-002',
          name: 'Supino Inclinado',
          name_variations: ['Incline Bench Press'],
          group_muscles: ['Peito'],
          category: 'Composto',
          equipment: 'Banco inclinado',
          primary_equipment: 'Barbell',
          secondary_equipment: null,
          movement_pattern: 'Horizontal Push',
          musculo_alvo: ['peitoral_superior'],
          stabilizers: [],
          execution_type: 'Bilateral' as const,
          equivalent_alternatives: [],
          muscle_group_alternatives: [],
          // tracking_type intentionally omitted
        },
      ],
    };

    await loader.loadSeedFile(noTrackingTypeSeed);

    const exercise = await repo.findById('test-seed-002');
    expect(exercise).not.toBeNull();
    expect(exercise!.toPrimitives().trackingType).toBe('reps_load');
  });
});
