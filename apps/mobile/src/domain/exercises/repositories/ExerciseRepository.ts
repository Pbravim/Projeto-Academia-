import type { Exercise } from '../entities/Exercise';

export interface ExerciseRepository {
  save(exercise: Exercise): Promise<void>;
  list(): Promise<Exercise[]>;
  findById(id: string): Promise<Exercise | null>;
  findByNormalizedName(normalizedName: string): Promise<Exercise | null>;
  delete(id: string): Promise<void>;
}
