import type { ExecucaoExercicio } from '../../../domain/historico/repositories/HistoricoRepository';

export interface SerieHistoricoViewModel {
  descricao: string;
  tipo: 'aquecimento' | 'valida';
  rm1Estimado: string | null;
}

export interface ExecucaoHistoricoViewModel {
  data: string;
  melhorRm1: string;
  volumeTotal: string;
  series: SerieHistoricoViewModel[];
}

export interface HistoricoExercicioViewModel {
  exercicioNome: string;
  execucoes: ExecucaoHistoricoViewModel[];
  emptyStateMessage: string | null;
}

export function buildHistoricoExercicioViewModel(
  exercicioNome: string,
  execucoes: ExecucaoExercicio[]
): HistoricoExercicioViewModel {
  if (execucoes.length === 0) {
    return { exercicioNome, execucoes: [], emptyStateMessage: 'Nenhuma execucao registrada ainda.' };
  }

  return {
    exercicioNome,
    execucoes: execucoes.map(buildExecucaoViewModel),
    emptyStateMessage: null,
  };
}

function buildExecucaoViewModel(execucao: ExecucaoExercicio): ExecucaoHistoricoViewModel {
  const validas = execucao.series.filter((s) => s.tipoSerie === 'valida');
  const melhorRm1 = validas.reduce((max, s) => {
    const rm1 = s.cargaKg * (1 + s.repeticoes / 30);
    return rm1 > max ? rm1 : max;
  }, 0);
  const volumeKg = validas.reduce((acc, s) => acc + s.cargaKg * s.repeticoes, 0);

  return {
    data: formatDate(execucao.dataExecucao),
    melhorRm1: validas.length > 0 ? `${melhorRm1.toFixed(1)} kg` : '—',
    volumeTotal: validas.length > 0 ? formatVolume(volumeKg) : '—',
    series: execucao.series.map((s) => ({
      descricao: `${s.cargaKg} kg × ${s.repeticoes} rep`,
      tipo: s.tipoSerie,
      rm1Estimado:
        s.tipoSerie === 'valida'
          ? `1RM ~${(s.cargaKg * (1 + s.repeticoes / 30)).toFixed(1)} kg`
          : null,
    })),
  };
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
  return `${kg} kg`;
}
