import type { ExecucaoExercicio, HistoricoRepository } from '../../../domain/historico/repositories/HistoricoRepository';

export interface HistoricoAnteriorInput {
  sessaoId: string;
  inicio: string;
  exercicioIds: string[];
}

/** One bulk read; completed current/future sessions can never become a PR baseline. */
export class GetHistoricoAnteriorDaSessaoUseCase {
  constructor(private readonly repository: HistoricoRepository) {}

  async execute(input: HistoricoAnteriorInput): Promise<Map<string, ExecucaoExercicio[]>> {
    const ids = [...new Set(input.exercicioIds)];
    const historico = await this.repository.getHistoricoExercicios(ids);
    const inicio = Date.parse(input.inicio);
    return new Map(ids.map((id) => [id, (historico.get(id) ?? []).filter((ex) =>
      ex.sessaoTreinoId !== input.sessaoId && Date.parse(ex.dataExecucao) < inicio)]));
  }
}
