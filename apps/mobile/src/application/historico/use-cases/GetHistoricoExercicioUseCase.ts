import type { ExecucaoExercicio, HistoricoRepository } from '../../../domain/historico/repositories/HistoricoRepository';

interface GetHistoricoExercicioUseCaseDependencies {
  historicoRepository: HistoricoRepository;
}

/** Retorna todas as execucoes passadas de um exercicio em sessoes finalizadas, ordenadas da mais recente para a mais antiga. */
export class GetHistoricoExercicioUseCase {
  constructor(private readonly dependencies: GetHistoricoExercicioUseCaseDependencies) {}

  /** @returns execucoes em ordem decrescente por data; lista vazia se nao houver historico */
  async execute(exercicioId: string): Promise<ExecucaoExercicio[]> {
    return this.dependencies.historicoRepository.getHistoricoExercicio(exercicioId);
  }
}
