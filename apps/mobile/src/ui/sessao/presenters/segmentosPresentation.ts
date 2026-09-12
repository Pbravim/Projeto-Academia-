import type { SerieSegmentoPrimitives } from '../../../domain/sessoes/entities/SerieSegmento';
import { formatCarga } from '../../shared/components/sessionSeriesTableModel';
import type { AppLocale } from '../../shared/i18n/core';

export type MetodoSessao = 'normal' | 'drop_set' | 'piramide' | 'rest_pause';

interface SerieMaeBase {
  cargaKg: number | null;
  repeticoes: number | null;
}

type SegmentoBase = Pick<SerieSegmentoPrimitives, 'ordem' | 'cargaKg' | 'repeticoes'>;

/** Pilha "60×8 → 50×6 → 40×7" da série-mãe + degraus, ordenados por `ordem`. Sem degraus → `null`. */
export function formatDegrausStack(
  serie: SerieMaeBase,
  segmentos: SegmentoBase[] | undefined,
  locale: AppLocale = 'pt-BR',
): string | null {
  if (!segmentos || segmentos.length === 0) return null;
  if (serie.cargaKg == null || serie.repeticoes == null) return null;

  const degraus = [...segmentos]
    .sort((a, b) => a.ordem - b.ordem)
    .filter((s) => s.cargaKg != null && s.repeticoes != null);

  const partes = [
    `${formatCarga(serie.cargaKg, locale)}×${serie.repeticoes}`,
    ...degraus.map((s) => `${formatCarga(s.cargaKg!, locale)}×${s.repeticoes}`),
  ];

  return partes.join(' → ');
}

/** Métodos cujo template pré-cria um 2º degrau (Degrau 2 — prescrito). */
export function precisaDegrauPrescrito(metodo: string): boolean {
  return metodo === 'drop_set' || metodo === 'rest_pause';
}

/** Somente `rest_pause` exibe o campo de descanso do degrau. */
export function mostraDescanso(metodo: string): boolean {
  return metodo === 'rest_pause';
}

/** Volume da série-mãe + Σ degraus, para o chip de resumo da lista. */
export function volumeComDegraus(serie: SerieMaeBase, segmentos: SegmentoBase[] | undefined): number {
  const base = (serie.cargaKg ?? 0) * (serie.repeticoes ?? 0);
  const extra = (segmentos ?? []).reduce((sum, s) => sum + (s.cargaKg ?? 0) * (s.repeticoes ?? 0), 0);
  return base + extra;
}

function formatDuracao(segundos: number): string {
  const min = Math.floor(segundos / 60);
  const sec = segundos % 60;
  if (min > 0) return `${min}:${String(sec).padStart(2, '0')} min`;
  return `${sec}s`;
}

interface SerieMetricInput {
  cargaKg: number | null;
  repeticoes: number | null;
  duracaoSegundos: number | null;
  distanciaMetros: number | null;
  intensidade: number | null;
}

/** Label de uma linha de série, adaptado ao `trackingType` do exercício. */
export function formatSerieMetric(
  serie: SerieMetricInput,
  trackingType: string,
  locale: AppLocale = 'pt-BR',
): string {
  switch (trackingType) {
    case 'cardio': {
      const parts: string[] = [];
      if (serie.duracaoSegundos != null) parts.push(formatDuracao(serie.duracaoSegundos));
      if (serie.distanciaMetros != null) parts.push(`${serie.distanciaMetros}m`);
      if (serie.intensidade != null) parts.push(`int. ${serie.intensidade}`);
      return parts.join(' · ') || '-';
    }
    case 'hold':
      return serie.duracaoSegundos != null ? formatDuracao(serie.duracaoSegundos) : '-';
    case 'reps_only':
      return serie.repeticoes != null ? `${serie.repeticoes} reps` : '-';
    default:
      return serie.cargaKg != null && serie.repeticoes != null
        ? `${formatCarga(serie.cargaKg, locale)} kg × ${serie.repeticoes}`
        : '-';
  }
}
