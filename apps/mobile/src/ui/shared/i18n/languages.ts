import type { AppLocale } from './core';

export interface LanguageOption {
  code: AppLocale;
  flag: string;
  /** Nome do idioma no próprio idioma (endônimo) — não é traduzido por locale. */
  endonym: string;
}

// Para adicionar um idioma: crie o dicionário em ./translations, registre-o no
// I18n em core.ts, inclua o código em AppLocale e acrescente uma entrada aqui.
// O seletor de idioma no Perfil renderiza esta lista automaticamente.
export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'pt-BR', flag: '🇧🇷', endonym: 'Português (Brasil)' },
  { code: 'en-US', flag: '🇺🇸', endonym: 'English (US)' },
];
