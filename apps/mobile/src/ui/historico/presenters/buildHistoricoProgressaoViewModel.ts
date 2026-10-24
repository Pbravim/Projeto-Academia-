import type { ExecucaoExercicio } from '../../../domain/historico/repositories/HistoricoRepository';
import { calcularPRs, ehSerieForcaValida } from '../../../domain/progressao/personalRecords';
import type { AppLocale } from '../../shared/i18n';
import { translate } from '../../shared/i18n/core';
import { formatNumber, formatShortDate } from '../../shared/i18n/formatters';
import type { LineChartPoint } from '../../shared/LineChart';

export type MetricaProgressao = 'carga' | 'volume' | 'e1rm';
export interface HistoricoProgressaoViewModel {
  charts: Record<MetricaProgressao, (LineChartPoint & { aproximado?: boolean })[]>;
  records: { label: string; value: string }[];
}

export function buildHistoricoProgressaoViewModel(execucoes: ExecucaoExercicio[], locale: AppLocale): HistoricoProgressaoViewModel {
  const charts: HistoricoProgressaoViewModel['charts'] = { carga: [], volume: [], e1rm: [] };
  const sorted = [...execucoes].sort((a, b) => Date.parse(a.dataExecucao) - Date.parse(b.dataExecucao));
  for (const ex of sorted.filter((e) => e.series.some(ehSerieForcaValida)).slice(-14)) {
    const records = calcularPRs([ex]);
    const label = formatShortDate(ex.dataExecucao, locale);
    charts.carga.push({ label, value: records.prCarga! });
    charts.volume.push({ label, value: records.prVolumeSessao! });
    charts.e1rm.push({ label, value: Math.round(records.prE1RM! * 10) / 10, aproximado: records.melhorSerie!.repeticoes > 12 });
  }
  const prs = calcularPRs(execucoes);
  if (prs.melhorSerie === null) return { charts, records: [] };
  const kg = (value: number) => `${formatNumber(value, locale)} kg`;
  const records = [
    { label: translate(locale, 'progressao.carga'), value: kg(prs.prCarga!) },
    { label: translate(locale, 'progressao.strength'), value: `${prs.melhorSerie.repeticoes > 12 ? '~' : ''}${kg(Math.round(prs.prE1RM! * 10) / 10)}` },
    { label: translate(locale, 'progressao.volume'), value: kg(prs.prVolumeSessao!) },
    ...[...prs.prRepsPorCarga].sort(([a], [b]) => b - a).slice(0, 5).map(([carga, reps]) => ({
      label: translate(locale, 'progressao.tipo.reps'),
      value: translate(locale, 'progressao.repsValue', { reps, carga: formatNumber(carga, locale) }),
    })),
    { label: translate(locale, 'progressao.bestSet'), value: `${kg(prs.melhorSerie.cargaKg)} × ${prs.melhorSerie.repeticoes}` },
  ];
  return { charts, records };
}
