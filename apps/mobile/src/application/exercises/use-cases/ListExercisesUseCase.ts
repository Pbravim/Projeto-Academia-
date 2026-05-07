import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import type { ExerciseRepository, ListExercisesOptions } from '../../../domain/exercises/repositories/ExerciseRepository';

/** Lista exercicios do catalogo ordenados alfabeticamente pelo nome (pt-BR). Suporta paginação via limit/offset. */
export class ListExercisesUseCase {
  constructor(private readonly exerciseRepository: ExerciseRepository) {}

  async execute(options?: ListExercisesOptions): Promise<ExercisePrimitives[]> {
    const exercises = await this.exerciseRepository.list(options);

    return exercises
      .map((exercise) => exercise.toPrimitives())
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
  }
}
