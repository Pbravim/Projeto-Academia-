import { Exercise } from '../../domain/exercises/entities/Exercise';
import { normalizeText } from '../../shared/utils/normalizeText';
import type { ExerciseRepository } from '../../domain/exercises/repositories/ExerciseRepository';

export interface SeedExerciseEntry {
  id: string;
  name: string;
  name_variations: string[];
  group_muscles: string[];
  category: string;
  equipment: string | null;
  primary_equipment: string | null;
  secondary_equipment: string | null;
  movement_pattern: string | null;
  musculo_alvo: string[];
  stabilizers: string[];
  execution_type: 'Unilateral' | 'Bilateral' | 'Can Be Both' | null;
  equivalent_alternatives: string[];
  muscle_group_alternatives: string[];
  media_local?: string | null;
  media_online?: string | null;
}

export interface SeedFile {
  catalog_version: number;
  exercises: SeedExerciseEntry[];
}

export class ExerciseSeedLoader {
  constructor(private readonly repository: ExerciseRepository) {}

  async loadSeedFile(seed: SeedFile): Promise<void> {
    for (const entry of seed.exercises) {
      const existing = await this.repository.findById(entry.id);
      if (existing && existing.toPrimitives().isCustom) continue;

      const exercise = Exercise.restore({
        id: entry.id,
        name: entry.name,
        normalizedName: normalizeText(entry.name),
        groupMuscles: entry.group_muscles,
        category: entry.category,
        equipment: entry.equipment,
        loadUnit: 'kg',
        isCustom: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: new Date().toISOString(),
        mediaOnline: entry.media_online ?? null,
        mediaLocal: entry.media_local ?? null,
        musculoAlvo: entry.musculo_alvo,
        movementPattern: entry.movement_pattern,
        stabilizers: entry.stabilizers,
        executionType: entry.execution_type,
        nameVariations: entry.name_variations,
        primaryEquipment: entry.primary_equipment,
        secondaryEquipment: entry.secondary_equipment,
        catalogVersion: seed.catalog_version,
        trackingType: 'reps_load',
      });

      await this.repository.upsertCatalogExercise(
        exercise,
        entry.equivalent_alternatives,
        entry.muscle_group_alternatives,
      );
    }
  }
}
