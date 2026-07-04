import type { SessaoDetalhe } from '../../../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import type { AppLocale } from '../../shared/i18n';
import { formatNumber, formatFixedDecimal } from '../../shared/i18n/formatters';

export interface SerieResumoItem {
  label: string;
}

export interface ExercicioResumoItem {
  nome: string;
  realizado: boolean;
  totalSeriesValidas: number;
  volume: number;
  melhorSerie: string | null;
}

export interface SessaoResumoViewModel {
  treinoNome: string;
  duracao: string;
  totalExercicios: number;
  exerciciosRealizados: number;
  totalSeriesValidas: number;
  volumeTotal: string;
  exercicios: ExercicioResumoItem[];
}

export function buildSessaoResumoViewModel(detalhe: SessaoDetalhe, locale: AppLocale = 'pt-BR'): SessaoResumoViewModel {
  const { sessao, exercicios } = detalhe;

  const duracao = calcularDuracao(sessao.dataHoraInicio, sessao.dataHoraFim);

  let totalSeriesValidas = 0;
  let volumeTotalKg = 0;

  const exerciciosVM: ExercicioResumoItem[] = exercicios.map(({ sessaoExercicio, series }) => {
    const validas = series.filter((s) => s.tipoSerie === 'valida');
    // Apenas séries de força (carga×reps) contam para tonelagem/recordes;
    // séries de cardio/hold/reps_only não poluem o volume.
    const validasForca = validas.filter(
      (s): s is typeof s & { cargaKg: number; repeticoes: number } =>
        s.cargaKg !== null && s.repeticoes !== null
    );
    const volume = validasForca.reduce((acc, s) => acc + s.cargaKg * s.repeticoes, 0);

    totalSeriesValidas += validas.length;
    volumeTotalKg += volume;

    const melhor = validasForca.reduce<{ cargaKg: number; repeticoes: number } | null>(
      (best, s) => {
        const rm = s.cargaKg * (1 + s.repeticoes / 30);
        const bestRm = best ? best.cargaKg * (1 + best.repeticoes / 30) : -1;
        return rm > bestRm ? s : best;
      },
      null
    );

    return {
      nome: sessaoExercicio.nomeSnapshot,
      realizado: validas.length > 0,
      totalSeriesValidas: validas.length,
      volume,
      melhorSerie: melhor ? `${melhor.cargaKg}kg × ${melhor.repeticoes}` : null,
    };
  });

  return {
    treinoNome: sessao.treinoNomeSnapshot,
    duracao,
    totalExercicios: exercicios.length,
    exerciciosRealizados: exercicios.filter(({ series }) =>
      series.some((s) => s.tipoSerie === 'valida')
    ).length,
    totalSeriesValidas,
    volumeTotal: formatVolume(volumeTotalKg, locale),
    exercicios: exerciciosVM,
  };
}

function calcularDuracao(inicio: string, fim: string | null): string {
  if (!fim) return '–';
  const diffMs = new Date(fim).getTime() - new Date(inicio).getTime();
  const totalMinutos = Math.floor(diffMs / 60000);
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  if (horas > 0) return `${horas}h ${minutos}min`;
  return `${totalMinutos}min`;
}

function formatVolume(kg: number, locale: AppLocale): string {
  if (kg >= 1000) return `${formatFixedDecimal(kg / 1000, locale, 1)} t`;
  return `${formatNumber(kg, locale)} kg`;
}
