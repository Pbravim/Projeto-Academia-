import type { ExecucaoExercicio, HistoricoRepository } from '../../../domain/historico/repositories/HistoricoRepository';

/** Incremento de carga sugerido ao atingir a meta de repetições. */
export const INCREMENTO_CARGA_KG = 2.5;

export interface SugestaoProgressao {
  cargaSugerida: number;
  motivo: string;
}

export interface SugerirProgressaoInput {
  exercicioId: string;
  execucoesRecomendadas: number | null;
  cargaPadrao: number | null;
}

interface SugerirProgressaoUseCaseDeps {
  historicoRepository: HistoricoRepository;
}

/**
 * Sugere aumento de carga quando o usuário atingiu todas as reps recomendadas
 * nas últimas 2 sessões finalizadas do exercício.
 * Retorna null quando não há dados suficientes ou a meta não foi atingida.
 */
export class SugerirProgressaoUseCase {
  constructor(private readonly deps: SugerirProgressaoUseCaseDeps) {}

  async execute(input: SugerirProgressaoInput): Promise<SugestaoProgressao | null> {
    if (input.execucoesRecomendadas == null) return null;

    const execucoes = await this.deps.historicoRepository.getHistoricoExercicio(input.exercicioId);
    return this._avaliar(input, execucoes);
  }

  async executeLote(inputs: SugerirProgressaoInput[]): Promise<Map<string, SugestaoProgressao | null>> {
    const ids = inputs.map((i) => i.exercicioId);
    const historicoMap = await this.deps.historicoRepository.getHistoricoExercicios(ids);

    const result = new Map<string, SugestaoProgressao | null>();
    for (const input of inputs) {
      const execucoes = historicoMap.get(input.exercicioId) ?? [];
      result.set(input.exercicioId, this._avaliar(input, execucoes));
    }
    return result;
  }

  private _avaliar(input: SugerirProgressaoInput, execucoes: ExecucaoExercicio[]): SugestaoProgressao | null {
    const meta = input.execucoesRecomendadas;
    if (meta == null) return null;

    const ultimas2 = execucoes.slice(0, 2);
    if (ultimas2.length < 2) return null;

    for (const execucao of ultimas2) {
      const validas = execucao.series.filter((s) => s.tipoSerie === 'valida');
      if (validas.length === 0) return null;
      if (!validas.every((s) => s.repeticoes >= meta)) return null;
    }

    const validasUltima = ultimas2[0].series.filter((s) => s.tipoSerie === 'valida');
    const cargaReferencia =
      input.cargaPadrao ??
      Math.max(...validasUltima.map((s) => s.cargaKg));

    return {
      cargaSugerida: cargaReferencia + INCREMENTO_CARGA_KG,
      motivo: `Meta de ${meta} reps atingida nas últimas 2 sessões`,
    };
  }
}
