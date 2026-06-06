import type { Exercise } from '../entities/Exercise';

export interface ListExercisesOptions {
  limit?: number;
  offset?: number;
}

export interface ExerciseRepository {
  save(exercise: Exercise): Promise<void>;
  list(options?: ListExercisesOptions): Promise<Exercise[]>;
  findById(id: string): Promise<Exercise | null>;
  findByIds(ids: string[]): Promise<Exercise[]>;
  findByNormalizedName(normalizedName: string): Promise<Exercise | null>;
  delete(id: string): Promise<void>;
  updateMedia(id: string, mediaOnline: string | null, mediaLocal: string | null): Promise<void>;

  // Search
  findByNameOrVariation(query: string): Promise<Exercise[]>;

  // Typed alternatives — equivalent exercises (same movement, same muscles)
  listEquivalentAlternativas(exercicioId: string): Promise<Exercise[]>;
  addEquivalentAlternativa(exercicioId: string, alternativaId: string): Promise<void>;

  // Typed alternatives — same muscle group, different movement
  listMuscleGroupAlternativas(exercicioId: string): Promise<Exercise[]>;
  addMuscleGroupAlternativa(exercicioId: string, alternativaId: string): Promise<void>;

  // Legacy untyped alternatives (kept for backward compatibility)
  listAlternativas(exercicioId: string): Promise<Exercise[]>;
  addAlternativa(exercicioId: string, alternativaId: string): Promise<void>;
  removeAlternativa(exercicioId: string, alternativaId: string): Promise<void>;

  // Seed upsert — only used by ExerciseSeedLoader; never overwrites is_custom=true exercises
  upsertCatalogExercise(exercise: Exercise, equivalentIds: string[], muscleGroupIds: string[]): Promise<void>;
}
