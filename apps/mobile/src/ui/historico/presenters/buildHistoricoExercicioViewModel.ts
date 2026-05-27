import type { LineChartPoint } from '../../shared/LineChart';
import type { ExecucaoExercicio } from '../../../domain/historico/repositories/HistoricoRepository';

export interface SerieHistoricoViewModel {
  id: string;
  descricao: string;
  rm1Estimado: string | null;
}

export interface ExecucaoHistoricoViewModel {
  data: string;
  melhorRm1: string;
  volumeTotal: string;
  series: SerieHistoricoViewModel[];
  substituiuLabel: string | null;
}

export interface PlateauInfo {
  sessoes: number;
  mensagem: string;
}

export interface HistoricoExercicioViewModel {
  exercicioNome: string;
  execucoes: ExecucaoHistoricoViewModel[];
  emptyStateMessage: string | null;
  rm1ChartPoints: LineChartPoint[];
  plateau: PlateauInfo | null;
}

const CHART_MAX = 14;
const SESSOES_PLATEAU = 4;
const MELHORA_MINIMA_KG = 1.0;

export function buildHistoricoExercicioViewModel(
  exercicioNome: string,
  execucoes: ExecucaoExercicio[]
): HistoricoExercicioViewModel {
  if (execucoes.length === 0) {
    return { exercicioNome, execucoes: [], emptyStateMessage: 'Nenhuma execucao registrada ainda.', rm1ChartPoints: [], plateau: null };
  }

  const rm1ChartPoints: LineChartPoint[] = execucoes
    .slice(0, CHART_MAX)
    .reverse()
    .map((ex) => {
      const validas = ex.series.filter((s) => s.tipoSerie === 'valida');
      const melhor = validas.reduce((max, s) => {
        const rm1 = s.cargaKg * (1 + s.repeticoes / 30);
        return rm1 > max ? rm1 : max;
      }, 0);
      return {
        value: parseFloat(melhor.toFixed(1)),
        label: formatShortDate(ex.dataExecucao),
      };
    })
    .filter((p) => p.value > 0);

  return {
    exercicioNome,
    execucoes: execucoes.map(buildExecucaoViewModel),
    emptyStateMessage: null,
    rm1ChartPoints,
    plateau: detectarPlateau(execucoes),
  };
}

function detectarPlateau(execucoes: ExecucaoExercicio[]): PlateauInfo | null {
  const comValidas = execucoes.filter((ex) =>
    ex.series.some((s) => s.tipoSerie === 'valida')
  );

  if (comValidas.length < SESSOES_PLATEAU) return null;

  const ultimas = comValidas.slice(0, SESSOES_PLATEAU);

  const rm1s = ultimas.map((ex) => {
    const validas = ex.series.filter((s) => s.tipoSerie === 'valida');
    return validas.reduce((max, s) => {
      const rm1 = s.cargaKg * (1 + s.repeticoes / 30);
      return rm1 > max ? rm1 : max;
    }, 0);
  });

  const maxNaJanela = Math.max(...rm1s);
  const rm1MaisAntigo = rm1s[SESSOES_PLATEAU - 1];

  if (maxNaJanela - rm1MaisAntigo < MELHORA_MINIMA_KG) {
    return {
      sessoes: SESSOES_PLATEAU,
      mensagem: `Sem melhora no 1RM estimado nas ultimas ${SESSOES_PLATEAU} sessoes. Considere aumentar volume, mudar a ordem dos exercicios ou trocar o estimulo.`,
    };
  }

  return null;
}

const MOTIVO_LABEL: Record<string, string> = {
  equipamento_indisponivel: 'equipamento indisponível',
  variacao: 'variação',
};

function buildExecucaoViewModel(execucao: ExecucaoExercicio): ExecucaoHistoricoViewModel {
  const validas = execucao.series.filter((s) => s.tipoSerie === 'valida');
  const melhorRm1 = validas.reduce((max, s) => {
    const rm1 = s.cargaKg * (1 + s.repeticoes / 30);
    return rm1 > max ? rm1 : max;
  }, 0);
  const volumeKg = validas.reduce((acc, s) => acc + s.cargaKg * s.repeticoes, 0);

  let substituiuLabel: string | null = null;
  if (execucao.substituiuExercicio ?? null) {
    const { nomeOriginal, motivo } = execucao.substituiuExercicio!;
    const motivoTexto = motivo ? ` · ${MOTIVO_LABEL[motivo] ?? motivo}` : '';
    substituiuLabel = `Substituiu: ${nomeOriginal}${motivoTexto}`;
  }

  return {
    data: formatDate(execucao.dataExecucao),
    melhorRm1: validas.length > 0 ? `${melhorRm1.toFixed(1)} kg` : '—',
    volumeTotal: validas.length > 0 ? formatVolume(volumeKg) : '—',
    series: execucao.series.map((s) => ({
      id: s.id,
      descricao: `${s.cargaKg} kg × ${s.repeticoes} rep`,
      rm1Estimado: s.tipoSerie === 'valida'
        ? `1RM ~${(s.cargaKg * (1 + s.repeticoes / 30)).toFixed(1)} kg`
        : null,
    })),
    substituiuLabel,
  };
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatShortDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
  return `${kg} kg`;
}
