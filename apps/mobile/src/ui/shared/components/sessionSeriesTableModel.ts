import { calcularEstimativa1rm } from '../../../shared/utils/estimativa1rm';
import { formatCarga, formatDegrausStack } from '../degrauFormatters';
import { type AppLocale,translate } from '../i18n/core';
import { formatFixedDecimal } from '../i18n/formatters';

export { formatCarga } from '../degrauFormatters';

export interface SessionTableInputSet {
  cargaKg: number;
  repeticoes: number;
  /** Ex.: aquecimento — exibido esmaecido e fora de melhor set/1RM/volume. */
  muted?: boolean;
  /** Degraus (drop set/rest-pause/piramide) sobre esta série-mãe, já em ordem de exibição. */
  segmentos?: { cargaKg: number; repeticoes: number }[];
}

export interface SessionTableInputSession {
  id: string;
  dateLabel: string;
  subLabel?: string | null;
  sets: SessionTableInputSet[];
}

export interface SessionTableSetVM {
  /** Carga formatada, sem unidade (ex.: "82,5"). */
  cargaLabel: string;
  /** Repeticoes (ex.: "8"). */
  repsLabel: string;
  isBest: boolean;
  muted: boolean;
  /** Pilha "60×8 → 50×6" da série-mãe + degraus. `null` quando não há degraus. */
  degrausLabel: string | null;
}

export interface SessionTableRowVM {
  id: string;
  dateLabel: string;
  subLabel: string | null;
  sets: SessionTableSetVM[];
  setsCountLabel: string | null;
  ormLabel: string | null;
  volumeLabel: string | null;
  trend: 'up' | 'down' | null;
  isLatest: boolean;
}

export function formatVolume(kg: number, locale: AppLocale = 'pt-BR'): string {
  if (kg >= 1000) return `${formatFixedDecimal(kg / 1000, locale, 1)} t`;
  return `${formatCarga(kg, locale)} kg`;
}

export function formatKgDelta(
  first: number,
  last: number,
  locale: AppLocale = 'pt-BR',
): { direction: 'up' | 'down' | 'flat'; label: string } {
  const diff = Math.round((last - first) * 10) / 10;
  if (diff > 0) return { direction: 'up', label: translate(locale, 'sessionSeriesTable.deltaUp', { value: formatCarga(diff, locale) }) };
  if (diff < 0) return { direction: 'down', label: translate(locale, 'sessionSeriesTable.deltaDown', { value: formatCarga(Math.abs(diff), locale) }) };
  return { direction: 'flat', label: translate(locale, 'sessionSeriesTable.deltaFlat') };
}

/** Sessoes em ordem: mais recente primeiro. `trend` compara com a proxima da lista (mais antiga). */
export function buildSessionTableRows(
  sessions: SessionTableInputSession[],
  locale: AppLocale = 'pt-BR',
): SessionTableRowVM[] {
  const bestOrms = sessions.map((s) =>
    s.sets
      .filter((x) => !x.muted)
      .reduce((max, x) => Math.max(max, calcularEstimativa1rm(x.cargaKg, x.repeticoes)), 0),
  );

  return sessions.map((s, i) => {
    const valid = s.sets.filter((x) => !x.muted);
    const best = bestOrms[i];

    let bestMarked = false;
    const sets = s.sets.map((x) => {
      const isBest =
        !x.muted &&
        valid.length > 1 &&
        !bestMarked &&
        calcularEstimativa1rm(x.cargaKg, x.repeticoes) === best;
      if (isBest) bestMarked = true;
      const degrausLabel = formatDegrausStack({ cargaKg: x.cargaKg, repeticoes: x.repeticoes }, x.segmentos, locale);
      return {
        cargaLabel: formatCarga(x.cargaKg, locale),
        repsLabel: String(x.repeticoes),
        isBest,
        muted: x.muted ?? false,
        degrausLabel,
      };
    });

    const volumeDegraus = (x: SessionTableInputSet) =>
      (x.segmentos ?? []).reduce((sum, seg) => sum + seg.cargaKg * seg.repeticoes, 0);
    const volume = valid.reduce((acc, x) => acc + x.cargaKg * x.repeticoes + volumeDegraus(x), 0);
    const prevBest = bestOrms[i + 1];
    const trend =
      prevBest == null || prevBest === 0 || best === 0
        ? null
        : best > prevBest ? 'up' : best < prevBest ? 'down' : null;

    return {
      id: s.id,
      dateLabel: s.dateLabel,
      subLabel: s.subLabel ?? null,
      sets,
      setsCountLabel: valid.length > 0 ? translate(locale, 'common.seriesCount', { count: valid.length }) : null,
      ormLabel: best > 0 ? `1RM ~${formatCarga(Math.round(best * 10) / 10, locale)}` : null,
      volumeLabel: valid.length > 0 ? formatVolume(volume, locale) : null,
      trend,
      isLatest: i === 0,
    };
  });
}
