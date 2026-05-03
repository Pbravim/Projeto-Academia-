import type { SessaoDetalhe } from '../../../application/sessoes/use-cases/GetSessaoDetalheUseCase';

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

export function buildSessaoResumoViewModel(detalhe: SessaoDetalhe): SessaoResumoViewModel {
  const { sessao, exercicios } = detalhe;

  const duracao = calcularDuracao(sessao.dataHoraInicio, sessao.dataHoraFim);

  let totalSeriesValidas = 0;
  let volumeTotalKg = 0;

  const exerciciosVM: ExercicioResumoItem[] = exercicios.map(({ sessaoExercicio, series }) => {
    const validas = series.filter((s) => s.tipoSerie === 'valida');
    const volume = validas.reduce((acc, s) => acc + s.cargaKg * s.repeticoes, 0);

    totalSeriesValidas += validas.length;
    volumeTotalKg += volume;

    const melhor = validas.reduce<{ cargaKg: number; repeticoes: number } | null>((best, s) => {
      const rm = s.cargaKg * (1 + s.repeticoes / 30);
      const bestRm = best ? best.cargaKg * (1 + best.repeticoes / 30) : -1;
      return rm > bestRm ? s : best;
    }, null);

    return {
      nome: sessaoExercicio.nomeSnapshot,
      realizado: sessaoExercicio.realizado,
      totalSeriesValidas: validas.length,
      volume,
      melhorSerie: melhor ? `${melhor.cargaKg}kg × ${melhor.repeticoes}` : null,
    };
  });

  return {
    treinoNome: sessao.treinoNomeSnapshot,
    duracao,
    totalExercicios: exercicios.length,
    exerciciosRealizados: exercicios.filter((e) => e.sessaoExercicio.realizado).length,
    totalSeriesValidas,
    volumeTotal: formatVolume(volumeTotalKg),
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

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1).replace('.', ',')} t`;
  return `${kg.toLocaleString('pt-BR')} kg`;
}
