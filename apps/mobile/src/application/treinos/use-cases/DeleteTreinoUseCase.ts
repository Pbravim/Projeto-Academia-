import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import type { PlanoSemanalRepository } from '../../../domain/plano/repositories/PlanoSemanalRepository';
import type { TreinoExercicioRepository } from '../../../domain/treinos/repositories/TreinoExercicioRepository';
import type { TreinoRepository } from '../../../domain/treinos/repositories/TreinoRepository';
import type { SQLiteDatabaseClient } from '../../../infrastructure/persistence/sqlite/SQLiteDatabaseClient';
import { TreinoNotFoundError } from '../errors/TreinoNotFoundError';

interface DeleteTreinoUseCaseDependencies {
  treinoRepository: TreinoRepository;
  treinoExercicioRepository: TreinoExercicioRepository;
  sessaoTreinoRepository: SessaoTreinoRepository;
  planoSemanalRepository?: PlanoSemanalRepository;
  database?: SQLiteDatabaseClient;
}

export class DeleteTreinoUseCase {
  constructor(private readonly dependencies: DeleteTreinoUseCaseDependencies) {}

  async execute(id: string): Promise<void> {
    const treino = await this.dependencies.treinoRepository.findById(id);

    if (!treino) {
      throw new TreinoNotFoundError(id);
    }

    const deleteOperation = async () => {
      await this.dependencies.sessaoTreinoRepository.deleteByTreinoId(id);
      await this.dependencies.treinoExercicioRepository.deleteByTreinoId(id);
      await this.dependencies.treinoRepository.delete(id);
      await this.dependencies.planoSemanalRepository?.clearTreino(id);
    };

    if (this.dependencies.database) {
      await this.dependencies.database.withTransaction(deleteOperation);
    } else {
      await deleteOperation();
    }
  }
}
