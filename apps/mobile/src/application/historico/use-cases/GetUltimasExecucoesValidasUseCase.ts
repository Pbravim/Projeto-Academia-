import type { HistoricoRepository, UltimaExecucaoValida } from '../../../domain/historico/repositories/HistoricoRepository';

interface Deps {
  historicoRepository: HistoricoRepository;
}

/** Retorna o último registro válido de cada exercício em uma única query, evitando N queries paralelas. */
export class GetUltimasExecucoesValidasUseCase {
  constructor(private readonly deps: Deps) {}

  async execute(): Promise<Map<string, UltimaExecucaoValida>> {
    return this.deps.historicoRepository.getUltimasExecucoesValidas();
  }
}
