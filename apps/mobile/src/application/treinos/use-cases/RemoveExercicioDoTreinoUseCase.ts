import type { TreinoExercicioRepository } from '../../../domain/treinos/repositories/TreinoExercicioRepository';
import { TreinoExercicioNotFoundError } from '../errors/TreinoExercicioNotFoundError';

interface RemoveExercicioDoTreinoUseCaseDependencies {
  treinoExercicioRepository: TreinoExercicioRepository;
}

/** Remove um exercicio de um treino template pelo ID do vinculo (TreinoExercicio), nao pelo ID do exercicio. */
export class RemoveExercicioDoTreinoUseCase {
  constructor(private readonly dependencies: RemoveExercicioDoTreinoUseCaseDependencies) {}

  /**
   * @param treinoExercicioId ID do vinculo TreinoExercicio (nao o ID do exercicio)
   * @throws {TreinoExercicioNotFoundError} vinculo nao encontrado
   */
  async execute(treinoExercicioId: string): Promise<void> {
    const item = await this.dependencies.treinoExercicioRepository.findById(treinoExercicioId);
    if (!item) throw new TreinoExercicioNotFoundError(treinoExercicioId);

    const { treinoId } = item.toPrimitives();
    await this.dependencies.treinoExercicioRepository.delete(treinoExercicioId);

    // Re-index remaining exercises to close the gap left by the removed one
    const remaining = await this.dependencies.treinoExercicioRepository.listByTreinoId(treinoId);
    await Promise.all(
      remaining.map((te, index) =>
        this.dependencies.treinoExercicioRepository.updateOrdem(te.toPrimitives().id, index + 1)
      )
    );
  }
}
