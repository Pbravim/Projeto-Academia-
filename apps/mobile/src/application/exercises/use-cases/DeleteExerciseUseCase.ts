import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';
import { ExerciseNotFoundError } from '../errors/ExerciseNotFoundError';

interface DeleteExerciseUseCaseDependencies {
  exerciseRepository: ExerciseRepository;
}

/** Remove um exercicio do catalogo. Nao afeta series ou snapshots em sessoes ja registradas. */
export class DeleteExerciseUseCase {
  constructor(private readonly dependencies: DeleteExerciseUseCaseDependencies) {}

  /** @throws {ExerciseNotFoundError} exercicio nao encontrado */
  async execute(id: string): Promise<void> {
    const exercise = await this.dependencies.exerciseRepository.findById(id);

    if (!exercise) {
      throw new ExerciseNotFoundError(id);
    }

    await this.dependencies.exerciseRepository.delete(id);
  }
}
