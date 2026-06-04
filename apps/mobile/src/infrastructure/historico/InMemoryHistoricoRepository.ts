import type {
  ExecucaoExercicio,
  HistoricoRepository,
  UltimaExecucaoValida,
} from '../../domain/historico/repositories/HistoricoRepository';
import { calcularEstimativa1rm } from '../../shared/utils/estimativa1rm';

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

  async getHistoricoExercicios(exercicioIds: string[]): Promise<Map<string, ExecucaoExercicio[]>> {
    const result = new Map<string, ExecucaoExercicio[]>();
    for (const id of exercicioIds) {
      result.set(id, await this.getHistoricoExercicio(id));
    }
    return result;
  }

  async getUltimasExecucoesValidas(): Promise<Map<string, UltimaExecucaoValida>> {
    const byExercicio = new Map<string, { dataExecucao: string; melhor: { cargaKg: number; repeticoes: number } }>();

    for (const { exercicioId, execucao } of this.records) {
      const validas = execucao.series.filter((s) => s.tipoSerie === 'valida');
      if (validas.length === 0) continue;

      const existing = byExercicio.get(exercicioId);
      const isNewer = !existing || new Date(execucao.dataExecucao) > new Date(existing.dataExecucao);
      if (!isNewer) continue;

      const melhor = validas.reduce((a, b) =>
        calcularEstimativa1rm(a.cargaKg, a.repeticoes) >= calcularEstimativa1rm(b.cargaKg, b.repeticoes) ? a : b
      );
      byExercicio.set(exercicioId, { dataExecucao: execucao.dataExecucao, melhor });
    }

    const result = new Map<string, UltimaExecucaoValida>();
    for (const [exercicioId, { dataExecucao, melhor }] of byExercicio) {
      result.set(exercicioId, { cargaKg: melhor.cargaKg, repeticoes: melhor.repeticoes, dataExecucao });
    }
    return result;
  }

  async getUltimaExecucaoValida(exercicioId: string): Promise<UltimaExecucaoValida | null> {
    const execucoes = await this.getHistoricoExercicio(exercicioId);
    for (const execucao of execucoes) {
      const validas = execucao.series.filter((s) => s.tipoSerie === 'valida');
      if (validas.length === 0) continue;
      const melhor = validas.reduce((a, b) =>
        calcularEstimativa1rm(a.cargaKg, a.repeticoes) >= calcularEstimativa1rm(b.cargaKg, b.repeticoes) ? a : b
      );
      return { cargaKg: melhor.cargaKg, repeticoes: melhor.repeticoes, dataExecucao: execucao.dataExecucao };
    }
    return null;
  }
}
