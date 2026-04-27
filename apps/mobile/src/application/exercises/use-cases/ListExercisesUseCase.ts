import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';

export class ListExercisesUseCase {
  constructor(private readonly exerciseRepository: ExerciseRepository) {}

  async execute(): Promise<ExercisePrimitives[]> {
    const exercises = await this.exerciseRepository.list();

    return exercises
      .map((exercise) => exercise.toPrimitives())
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
  }
}
