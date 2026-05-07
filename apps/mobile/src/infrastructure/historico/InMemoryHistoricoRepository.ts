import type {
  ExecucaoExercicio,
  HistoricoRepository,
  UltimaExecucaoValida,
} from '../../domain/historico/repositories/HistoricoRepository';

interface SeedRecord {
  exercicioId: string;
  execucao: ExecucaoExercicio;
}

export class InMemoryHistoricoRepository implements HistoricoRepository {
  private readonly records: SeedRecord[] = [];

  seed(exercicioId: string, execucao: ExecucaoExercicio): void {
    this.records.push({ exercicioId, execucao });
  }

  async getHistoricoExercicio(exercicioId: string): Promise<ExecucaoExercicio[]> {
    return this.records
      .filter((r) => r.exercicioId === exercicioId)
      .map((r) => r.execucao)
      .sort((a, b) => new Date(b.dataExecucao).getTime() - new Date(a.dataExecucao).getTime());
  }

  async getUltimasExecucoesValidas(): Promise<Map<string, UltimaExecucaoValida>> {
    const exercicioIds = [...new Set(this.records.map((r) => r.exercicioId))];
    const result = new Map<string, UltimaExecucaoValida>();
    for (const id of exercicioIds) {
      const ultima = await this.getUltimaExecucaoValida(id);
      if (ultima) result.set(id, ultima);
    }
    return result;
  }

  async getUltimaExecucaoValida(exercicioId: string): Promise<UltimaExecucaoValida | null> {
    const execucoes = await this.getHistoricoExercicio(exercicioId);
    for (const execucao of execucoes) {
      const validas = execucao.series.filter((s) => s.tipoSerie === 'valida');
      if (validas.length === 0) continue;
      const melhor = validas.reduce((a, b) =>
        a.cargaKg * (1 + a.repeticoes / 30) >= b.cargaKg * (1 + b.repeticoes / 30) ? a : b
      );
      return { cargaKg: melhor.cargaKg, repeticoes: melhor.repeticoes, dataExecucao: execucao.dataExecucao };
    }
    return null;
  }
}
