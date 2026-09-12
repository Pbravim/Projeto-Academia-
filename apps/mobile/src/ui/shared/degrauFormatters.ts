import type { AppLocale } from './i18n/core';
import { formatFixedDecimal } from './i18n/formatters';

/** Carga formatada, sem unidade (ex.: "82,5"). Sem UI — usada por presenters e pela tabela de histórico. */
export function formatCarga(kg: number, locale: AppLocale = 'pt-BR'): string {
  if (kg % 1 === 0) return String(kg);
  const oneDecimal = Math.round(kg * 10) / 10;
  return formatFixedDecimal(kg, locale, oneDecimal === kg ? 1 : 2);
}

/** "1:30 min" acima de 60s, "45s" abaixo. */
export function formatDuracao(segundos: number): string {
  const min = Math.floor(segundos / 60);
  const sec = segundos % 60;
  if (min > 0) return `${min}:${String(sec).padStart(2, '0')} min`;
  return `${sec}s`;
}

interface DegrauParte {
  cargaKg: number | null;
  repeticoes: number | null;
}

/**
 * Junta mãe + degraus **já ordenados** em "60×8 → 50×6 → 40×7" — quem chama ordena
 * (a ordem de exibição vem de fontes diferentes: `ordem` do domínio ou já pré-ordenado
 * pelo caller). Sem degraus válidos ou mãe sem carga/reps → `null`.
 */
export function formatDegrausStack(
  mae: DegrauParte,
  degrausOrdenados: DegrauParte[] | undefined,
  locale: AppLocale = 'pt-BR',
): string | null {
  if (!degrausOrdenados || degrausOrdenados.length === 0) return null;
  if (mae.cargaKg == null || mae.repeticoes == null) return null;

  const validos = degrausOrdenados.filter((d) => d.cargaKg != null && d.repeticoes != null);

  const partes = [
    `${formatCarga(mae.cargaKg, locale)}×${mae.repeticoes}`,
    ...validos.map((d) => `${formatCarga(d.cargaKg!, locale)}×${d.repeticoes}`),
  ];

  return partes.join(' → ');
}
