import { getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { databaseClient } from '../../../bootstrap/databaseClient';

import { type AppLocale, type LocalePreference,translate } from './core';

export { type AppLocale, type LocalePreference,translate };

const SETTING_KEY = 'locale_preference';

function systemLocale(): AppLocale {
  const tag = getLocales()[0]?.languageTag ?? 'pt-BR';
  return tag.toLowerCase().startsWith('en') ? 'en-US' : 'pt-BR';
}

interface LocaleContextValue {
  locale: AppLocale;
  preference: LocalePreference;
  setPreference: (p: LocalePreference) => void;
}
const LocaleContext = createContext<LocaleContextValue>({ locale: 'pt-BR', preference: 'system', setPreference: () => {} });

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<LocalePreference>('system');
  useEffect(() => {
    void databaseClient.getSetting(SETTING_KEY).then((saved) => {
      if (saved === 'pt-BR' || saved === 'en-US' || saved === 'system') setPreferenceState(saved);
    });
  }, []);
  const setPreference = useCallback((p: LocalePreference) => {
    setPreferenceState(p);
    void databaseClient.setSetting(SETTING_KEY, p);
  }, []);
  const locale = preference === 'system' ? systemLocale() : preference;
  const value = useMemo(() => ({ locale, preference, setPreference }), [locale, preference, setPreference]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): AppLocale { return useContext(LocaleContext).locale; }
export function useLocalePreference() {
  const { preference, setPreference } = useContext(LocaleContext);
  return { preference, setPreference };
}
export function useT() {
  const locale = useLocale();
  return useCallback((key: string, options?: Record<string, unknown>) => translate(locale, key, options), [locale]);
}
