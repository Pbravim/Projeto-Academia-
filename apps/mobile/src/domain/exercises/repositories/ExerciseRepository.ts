import type { Exercise } from '../entities/Exercise';

export interface ListExercisesOptions {
  limit?: number;
  offset?: number;
}

export interface ExerciseRepository {
  save(exercise: Exercise): Promise<void>;
  list(options?: ListExercisesOptions): Promise<Exercise[]>;
  findById(id: string): Promise<Exercise | null>;
  findByNormalizedName(normalizedName: string): Promise<Exercise | null>;
  delete(id: string): Promise<void>;
  updateMedia(id: string, mediaOnline: string | null, mediaLocal: string | null): Promise<void>;
  listAlternativas(exercicioId: string): Promise<Exercise[]>;
  addAlternativa(exercicioId: string, alternativaId: string): Promise<void>;
  removeAlternativa(exercicioId: string, alternativaId: string): Promise<void>;
}
