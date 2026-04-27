import type { Exercise } from '../entities/Exercise';

export interface ExerciseRepository {
  save(exercise: Exercise): Promise<void>;
  list(): Promise<Exercise[]>;
  findByNormalizedName(normalizedName: string): Promise<Exercise | null>;
}
