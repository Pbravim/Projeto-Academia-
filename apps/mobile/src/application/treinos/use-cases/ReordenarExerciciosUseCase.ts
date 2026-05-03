import type { TreinoExercicioRepository } from '../../../domain/treinos/repositories/TreinoExercicioRepository';
import type { TreinoRepository } from '../../../domain/treinos/repositories/TreinoRepository';
import { TreinoNotFoundError } from '../errors/TreinoNotFoundError';

export interface ReordenarExerciciosInput {
  treinoId: string;
  treinoExercicioIds: string[];
}

interface ReordenarExerciciosUseCaseDependencies {
  treinoRepository: TreinoRepository;
  treinoExercicioRepository: TreinoExercicioRepository;
}

/** Reordena os exercicios de um treino. A nova ordem e determinada pela posicao dos IDs em `treinoExercicioIds`. */
export class ReordenarExerciciosUseCase {
  constructor(private readonly dependencies: ReordenarExerciciosUseCaseDependencies) {}

  /**
   * `treinoExercicioIds` deve conter todos os IDs dos vinculos do treino na nova ordem desejada.
   * @throws {TreinoNotFoundError} treino nao encontrado
   */
  async execute(input: ReordenarExerciciosInput): Promise<void> {
    const treino = await this.dependencies.treinoRepository.findById(input.treinoId);
    if (!treino) throw new TreinoNotFoundError(input.treinoId);

    await Promise.all(
      input.treinoExercicioIds.map((id, index) =>
        this.dependencies.treinoExercicioRepository.updateOrdem(id, index + 1)
      )
    );
  }
}
