import type { HistoricoRepository } from '../../../domain/historico/repositories/HistoricoRepository';

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
    const ultimas2 = execucoes.slice(0, 2);

    if (ultimas2.length < 2) return null;

    for (const execucao of ultimas2) {
      const validas = execucao.series.filter((s) => s.tipoSerie === 'valida');
      if (validas.length === 0) return null;
      if (!validas.every((s) => s.repeticoes >= input.execucoesRecomendadas!)) return null;
    }

    const cargaReferencia =
      input.cargaPadrao ??
      Math.max(...ultimas2[0].series.filter((s) => s.tipoSerie === 'valida').map((s) => s.cargaKg));

    return {
      cargaSugerida: cargaReferencia + 2.5,
      motivo: `Meta de ${input.execucoesRecomendadas} reps atingida nas últimas 2 sessões`,
    };
  }
}
