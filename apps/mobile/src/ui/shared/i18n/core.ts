import { I18n } from 'i18n-js';

import { enUS } from './translations/en-US';
import { ptBR } from './translations/pt-BR';

export type LocalePreference = 'system' | 'pt-BR' | 'en-US';
export type AppLocale = 'pt-BR' | 'en-US';

const i18n = new I18n({ 'pt-BR': ptBR, 'en-US': enUS });
i18n.defaultLocale = 'pt-BR';
i18n.enableFallback = true;

export function translate(locale: AppLocale, key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, { ...options, locale });
}
