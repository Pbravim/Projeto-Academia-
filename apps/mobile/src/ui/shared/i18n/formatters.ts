import type { AppLocale } from './index';

function toDate(value: Date | string): Date {
  return typeof value === 'string' ? new Date(value) : value;
}

/** DD/MM (pt-BR) or MM/DD (en-US) — no year. */
export function formatShortDate(value: Date | string, locale: AppLocale): string {
  return toDate(value).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
}

/** DD/MM/YYYY (pt-BR) or MM/DD/YYYY (en-US). */
export function formatFullDate(value: Date | string, locale: AppLocale): string {
  return toDate(value).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Day + abbreviated month name + full year, e.g. "04 de jul. de 2026" (pt-BR). */
export function formatMediumDate(value: Date | string, locale: AppLocale): string {
  return toDate(value).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

/** DD/MM/YY (pt-BR) or MM/DD/YY (en-US) — 2-digit year. */
export function formatCompactDate(value: Date | string, locale: AppLocale): string {
  return toDate(value).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/** HH:mm, 24h in pt-BR. */
export function formatTime(value: Date | string, locale: AppLocale): string {
  return toDate(value).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

/** Locale-aware thousands separator (e.g. 1.240 pt-BR vs 1,240 en-US). */
export function formatNumber(n: number, locale: AppLocale): string {
  return n.toLocaleString(locale);
}

/**
 * Fixed-decimal number (via `toFixed`, not `Intl` rounding) with the locale's decimal
 * separator swapped in — comma for pt-BR, dot for en-US. Using `toFixed` (rather than
 * `toLocaleString` with fraction-digit options) keeps pt-BR rounding byte-for-byte
 * identical to the pre-i18n behavior.
 */
export function formatFixedDecimal(n: number, locale: AppLocale, fractionDigits: number): string {
  const fixed = n.toFixed(fractionDigits);
  return locale === 'pt-BR' ? fixed.replace('.', ',') : fixed;
}
