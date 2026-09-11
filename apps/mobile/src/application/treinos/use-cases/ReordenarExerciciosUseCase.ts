import type { TransactionPort } from '../../../domain/shared/ports/TransactionPort';
import type { TreinoExercicioRepository } from '../../../domain/treinos/repositories/TreinoExercicioRepository';
import type { TreinoRepository } from '../../../domain/treinos/repositories/TreinoRepository';
import { TreinoExercicioNotFoundError } from '../errors/TreinoExercicioNotFoundError';
import { TreinoNotFoundError } from '../errors/TreinoNotFoundError';

export class ReordenacaoIncompletaError extends Error {
  constructor(missingIds: string[]) {
    super(`Reordenacao incompleta: IDs ausentes: ${missingIds.join(', ')}`);
    this.name = 'ReordenacaoIncompletaError';
  }
}

export interface ReordenarExerciciosInput {
  treinoId: string;
  treinoExercicioIds: string[];
}

interface ReordenarExerciciosUseCaseDependencies {
  treinoRepository: TreinoRepository;
  treinoExercicioRepository: TreinoExercicioRepository;
  database?: TransactionPort;
}

/** Reordena os exercicios de um treino. A nova ordem e determinada pela posicao dos IDs em `treinoExercicioIds`. */
export class ReordenarExerciciosUseCase {
  constructor(private readonly dependencies: ReordenarExerciciosUseCaseDependencies) {}

  /**
   * `treinoExercicioIds` deve conter TODOS os IDs dos vinculos do treino na nova ordem desejada.
   * @throws {TreinoNotFoundError} treino nao encontrado
   * @throws {TreinoExercicioNotFoundError} algum ID nao pertence ao treino informado
   * @throws {ReordenacaoIncompletaError} array parcial — faltam IDs do treino
   */
  async execute(input: ReordenarExerciciosInput): Promise<void> {
    const treino = await this.dependencies.treinoRepository.findById(input.treinoId);
    if (!treino) throw new TreinoNotFoundError(input.treinoId);

    const existentes = await this.dependencies.treinoExercicioRepository.listByTreinoId(input.treinoId);
    const idsExistentes = new Set(existentes.map((te) => te.toPrimitives().id));

    for (const id of input.treinoExercicioIds) {
      if (!idsExistentes.has(id)) throw new TreinoExercicioNotFoundError(id);
    }

    if (input.treinoExercicioIds.length !== idsExistentes.size) {
      const inputSet = new Set(input.treinoExercicioIds);
      const missingIds = existentes
        .map((te) => te.toPrimitives().id)
        .filter((id) => !inputSet.has(id));
      throw new ReordenacaoIncompletaError(missingIds);
    }

    const updateAll = () =>
      Promise.all(
        input.treinoExercicioIds.map((id, index) =>
          this.dependencies.treinoExercicioRepository.updateOrdem(id, index + 1)
        )
      );

    if (this.dependencies.database) {
      await this.dependencies.database.withTransaction(updateAll);
    } else {
      await updateAll();
    }
  }
}
