import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SerieRegistradaRepository } from '../../../domain/sessoes/repositories/SerieRegistradaRepository';
import type { PlanoSemanalRepository } from '../../../domain/plano/repositories/PlanoSemanalRepository';
import type { TreinoExercicioRepository } from '../../../domain/treinos/repositories/TreinoExercicioRepository';
import type { TreinoRepository } from '../../../domain/treinos/repositories/TreinoRepository';
import type { TransactionPort } from '../../../domain/shared/ports/TransactionPort';
import { TreinoNotFoundError } from '../errors/TreinoNotFoundError';

// Todas as dependências são obrigatórias de propósito: a versão com deps opcionais
// deixou a instância de produção sem planoSemanalRepository/database — plano semanal
// apontando para treino tombstoned e deleção multi-tabela fora de transação (P1-B).
interface DeleteTreinoUseCaseDependencies {
  treinoRepository: TreinoRepository;
  treinoExercicioRepository: TreinoExercicioRepository;
  sessaoTreinoRepository: SessaoTreinoRepository;
  sessaoExercicioRepository: SessaoExercicioRepository;
  serieRegistradaRepository: SerieRegistradaRepository;
  planoSemanalRepository: PlanoSemanalRepository;
  database: TransactionPort;
}

export class DeleteTreinoUseCase {
  constructor(private readonly dependencies: DeleteTreinoUseCaseDependencies) {}

  async execute(id: string): Promise<void> {
    const treino = await this.dependencies.treinoRepository.findById(id);

    if (!treino) {
      throw new TreinoNotFoundError(id);
    }

    await this.dependencies.database.withTransaction(async () => {
      // Filhos primeiro: séries -> sessão_exercicios -> sessões.
      await this.dependencies.serieRegistradaRepository.deleteByTreinoId(id);
      await this.dependencies.sessaoExercicioRepository.deleteByTreinoId(id);
      await this.dependencies.sessaoTreinoRepository.deleteByTreinoId(id);
      await this.dependencies.treinoExercicioRepository.deleteByTreinoId(id);
      await this.dependencies.treinoRepository.delete(id);
      await this.dependencies.planoSemanalRepository.clearTreino(id);
    });
  }
}
