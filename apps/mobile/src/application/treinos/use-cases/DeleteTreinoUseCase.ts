import type { TreinoExercicioRepository } from '../../../domain/treinos/repositories/TreinoExercicioRepository';
import type { TreinoRepository } from '../../../domain/treinos/repositories/TreinoRepository';
import { TreinoNotFoundError } from '../errors/TreinoNotFoundError';

interface DeleteTreinoUseCaseDependencies {
  treinoRepository: TreinoRepository;
  treinoExercicioRepository: TreinoExercicioRepository;
}

export class DeleteTreinoUseCase {
  constructor(private readonly dependencies: DeleteTreinoUseCaseDependencies) {}

  async execute(id: string): Promise<void> {
    const treino = await this.dependencies.treinoRepository.findById(id);

    if (!treino) {
      throw new TreinoNotFoundError(id);
    }

    await this.dependencies.treinoExercicioRepository.deleteByTreinoId(id);
    await this.dependencies.treinoRepository.delete(id);
  }
}
