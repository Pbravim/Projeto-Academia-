import type { Exercise } from '../../domain/exercises/entities/Exercise';
import type { ExerciseRepository } from '../../domain/exercises/repositories/ExerciseRepository';

export class InMemoryExerciseRepository implements ExerciseRepository {
  private readonly exercisesById = new Map<string, Exercise>();

  async save(exercise: Exercise): Promise<void> {
    this.exercisesById.set(exercise.toPrimitives().id, exercise);
  }

  async list(): Promise<Exercise[]> {
    return Array.from(this.exercisesById.values());
  }

  async findById(id: string): Promise<Exercise | null> {
    return this.exercisesById.get(id) ?? null;
  }

  async findByNormalizedName(normalizedName: string): Promise<Exercise | null> {
    for (const exercise of this.exercisesById.values()) {
      if (exercise.toPrimitives().normalizedName === normalizedName) {
        return exercise;
      }
    }

    return null;
  }

  async delete(id: string): Promise<void> {
    this.exercisesById.delete(id);
  }
}
