import type { HistoricoRepository, UltimaExecucaoValida } from '../../../domain/historico/repositories/HistoricoRepository';

interface GetUltimaExecucaoValidaUseCaseDependencies {
  historicoRepository: HistoricoRepository;
}

/**
 * Retorna a melhor serie valida (maior 1RM estimado) da sessao mais recente que incluiu o exercicio.
 * Usado para exibir o "ultimo peso" no card do catalogo.
 */
export class GetUltimaExecucaoValidaUseCase {
  constructor(private readonly dependencies: GetUltimaExecucaoValidaUseCaseDependencies) {}

  /** @returns dados da melhor serie valida da sessao mais recente, ou `null` se nao houver historico */
  async execute(exercicioId: string): Promise<UltimaExecucaoValida | null> {
    return this.dependencies.historicoRepository.getUltimaExecucaoValida(exercicioId);
  }
}
