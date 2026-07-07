import type { RegistroPesoPrimitives } from '../../../domain/peso/entities/RegistroPeso';
import { translate, type AppLocale } from '../../shared/i18n/core';
import { formatFullDate, formatShortDate } from '../../shared/i18n/formatters';

export interface RegistroPesoCardViewModel {
  id: string;
  peso: string;
  data: string;
  observacao: string | null;
  delta: string | null;
  pesoAumentou: boolean;
}

export interface PesoChartPoint {
  pesoKg: number;
  label: string;
}

export interface PesoViewModel {
  cards: RegistroPesoCardViewModel[];
  emptyStateMessage: string | null;
  pesoAtual: string | null;
  chartPoints: PesoChartPoint[];
}

const CHART_MAX_POINTS = 14;

export function buildPesoViewModel(registros: RegistroPesoPrimitives[], locale: AppLocale = 'pt-BR'): PesoViewModel {
  if (registros.length === 0) {
    return { cards: [], emptyStateMessage: translate(locale, 'peso.emptyStateMessage'), pesoAtual: null, chartPoints: [] };
  }

  const cards: RegistroPesoCardViewModel[] = registros.map((registro, index) => {
    const anterior = registros[index + 1] ?? null;
    const delta = anterior !== null ? registro.pesoKg - anterior.pesoKg : null;

    return {
      id: registro.id,
      peso: `${registro.pesoKg} kg`,
      data: formatFullDate(registro.dataRegistro, locale),
      observacao: registro.observacao,
      delta: delta !== null ? formatDelta(delta) : null,
      pesoAumentou: delta !== null ? delta > 0 : false,
    };
  });

  // registros vem do mais novo para o mais antigo — pega os últimos CHART_MAX_POINTS e reverte para cronológico
  const chartPoints: PesoChartPoint[] = registros
    .slice(0, CHART_MAX_POINTS)
    .reverse()
    .map((r) => ({
      pesoKg: r.pesoKg,
      label: formatShortDate(r.dataRegistro, locale),
    }));

  return {
    cards,
    emptyStateMessage: null,
    pesoAtual: `${registros[0].pesoKg} kg`,
    chartPoints,
  };
}

function formatDelta(delta: number): string {
  if (delta === 0) return '0 kg'; // zero é neutro — "-0 kg" lia como queda
  const abs = Math.abs(delta);
  const formatted = Number.isInteger(abs) ? `${abs}` : abs.toFixed(1);
  return delta > 0 ? `+${formatted} kg` : `-${formatted} kg`;
}
