import type { LineChartPoint } from '../../shared/LineChart';
import type { ExecucaoExercicio } from '../../../domain/historico/repositories/HistoricoRepository';
import { calcularEstimativa1rm } from '../../../shared/utils/estimativa1rm';
import {
  buildSessionTableRows,
  type SessionTableRowVM,
} from '../../shared/components/sessionSeriesTableModel';
import type { AppLocale } from '../../shared/i18n';
import { formatFullDate, formatShortDate } from '../../shared/i18n/formatters';

export interface PlateauInfo {
  sessoes: number;
  mensagem: string;
}

export interface HistoricoExercicioViewModel {
  exercicioNome: string;
  sessionRows: SessionTableRowVM[];
  emptyStateMessage: string | null;
  rm1ChartPoints: LineChartPoint[];
  plateau: PlateauInfo | null;
}

const CHART_MAX = 14;
const SESSOES_PLATEAU = 4;
const MELHORA_MINIMA_KG = 1.0;

export function buildHistoricoExercicioViewModel(
  exercicioNome: string,
  execucoes: ExecucaoExercicio[],
  locale: AppLocale = 'pt-BR'
): HistoricoExercicioViewModel {
  if (execucoes.length === 0) {
    return {
      exercicioNome,
      sessionRows: [],
      emptyStateMessage: 'Nenhuma execução registrada ainda.',
      rm1ChartPoints: [],
      plateau: null,
    };
  }

  const rm1ChartPoints: LineChartPoint[] = execucoes
    .slice(0, CHART_MAX)
    .reverse()
    .map((ex) => ({
      value: parseFloat(melhorRm1Valido(ex).toFixed(1)),
      label: formatShortDate(ex.dataExecucao, locale),
    }))
    .filter((p) => p.value > 0);

  const sessionRows = buildSessionTableRows(
    execucoes.map((ex, i) => ({
      id: `${ex.sessaoTreinoId}-${i}`,
      dateLabel: formatFullDate(ex.dataExecucao, locale),
      subLabel: buildSubstituiuLabel(ex),
      sets: [...ex.series]
        .sort((a, b) => a.ordem - b.ordem)
        .map((s) => ({
          cargaKg: s.cargaKg,
          repeticoes: s.repeticoes,
          muted: s.tipoSerie !== 'valida',
        })),
    })),
    locale,
  );

  return {
    exercicioNome,
    sessionRows,
    emptyStateMessage: null,
    rm1ChartPoints,
    plateau: detectarPlateau(execucoes),
  };
}

function melhorRm1Valido(ex: ExecucaoExercicio): number {
  return ex.series
    .filter((s) => s.tipoSerie === 'valida')
    .reduce((max, s) => Math.max(max, calcularEstimativa1rm(s.cargaKg, s.repeticoes)), 0);
}

function detectarPlateau(execucoes: ExecucaoExercicio[]): PlateauInfo | null {
  const comValidas = execucoes.filter((ex) =>
    ex.series.some((s) => s.tipoSerie === 'valida')
  );

  if (comValidas.length < SESSOES_PLATEAU) return null;

  const ultimas = comValidas.slice(0, SESSOES_PLATEAU);
  const rm1s = ultimas.map(melhorRm1Valido);

  const maxNaJanela = Math.max(...rm1s);
  const rm1MaisAntigo = rm1s[SESSOES_PLATEAU - 1];

  if (maxNaJanela - rm1MaisAntigo < MELHORA_MINIMA_KG) {
    return {
      sessoes: SESSOES_PLATEAU,
      mensagem: `Sem melhora no 1RM estimado nas últimas ${SESSOES_PLATEAU} sessões. Considere aumentar volume, mudar a ordem dos exercícios ou trocar o estímulo.`,
    };
  }

  return null;
}

const MOTIVO_LABEL: Record<string, string> = {
  equipamento_indisponivel: 'equipamento indisponível',
  variacao: 'variação',
};

function buildSubstituiuLabel(execucao: ExecucaoExercicio): string | null {
  if (!execucao.substituiuExercicio) return null;
  const { nomeOriginal, motivo } = execucao.substituiuExercicio;
  const motivoTexto = motivo ? ` · ${MOTIVO_LABEL[motivo] ?? motivo}` : '';
  return `Substituiu: ${nomeOriginal}${motivoTexto}`;
}
