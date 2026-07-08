import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { databaseClient } from '../../bootstrap/databaseClient';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Colors {
  // Surfaces
  background: string;
  card: string;
  cardAlt: string;
  cardBorder: string;
  // Hero card (dark green header)
  hero: string;
  heroText: string;
  heroSubtext: string;
  heroDescription: string;
  // Text
  textPrimary: string;
  textSecondary: string;
  textMeta: string;
  textLabel: string;
  // Accent
  accent: string;
  accentText: string;
  accentLight: string;
  // Status
  error: string;
  errorBg: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  warningBorder: string;
  // Inputs
  inputBg: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;
  // Tab bar
  tabBar: string;
  tabActive: string;
  tabText: string;
  tabTextActive: string;
}

// ── Energetic / athletic palette ──
// Warm charcoal (stone/espresso) hero + vivid energy-orange accent on
// warm neutral surfaces. Green appears only as a small success signal,
// never as surface or ambient tint.
const light: Colors = {
  background: '#f4f2f0',
  card: '#ffffff',
  cardAlt: '#edeae7',
  cardBorder: '#e0dcd8',
  hero: '#221e1a',
  heroText: '#f8f6f4',
  heroSubtext: '#fb923c',
  heroDescription: '#c4bcb4',
  textPrimary: '#1e1b18',
  textSecondary: '#6b6560',
  textMeta: '#453f3a',
  textLabel: '#3a3530',
  accent: '#f97316',
  accentText: '#ffffff',
  accentLight: '#ffe6d2',
  error: '#dc2626',
  errorBg: '#fde7e5',
  success: '#16a34a',
  successBg: '#dcfce7',
  warning: '#d97706',
  warningBg: '#fef0d9',
  warningBorder: '#f59e0b',
  inputBg: '#ffffff',
  inputBorder: '#dad5d0',
  inputText: '#1e1b18',
  inputPlaceholder: '#948d86',
  tabBar: '#221e1a',
  tabActive: '#f97316',
  tabText: '#95908a',
  tabTextActive: '#ffffff',
};

// Dark surfaces are warm charcoal (stone, no blue cast). Orange is the
// single brand accent; green is reserved for success states.
const dark: Colors = {
  background: '#121110',
  card: '#1c1a18',
  cardAlt: '#242220',
  cardBorder: '#312e2b',
  hero: '#282420',
  heroText: '#f5f3f1',
  heroSubtext: '#fb923c',
  heroDescription: '#b3aaa2',
  textPrimary: '#edecea',
  textSecondary: '#a19a94',
  // ≥4.5:1 sobre cardAlt (WCAG AA texto pequeno) — #867f79 dava ~4.0:1 (P3 a11y).
  textMeta: '#9a938c',
  textLabel: '#aea69f',
  accent: '#fb8b3c',
  accentText: '#1a0f05',
  accentLight: '#2a1c0d',
  error: '#f0635a',
  errorBg: '#3a1714',
  success: '#4ade80',
  successBg: '#132b1e',
  warning: '#f0a93c',
  warningBg: '#2a2010',
  warningBorder: '#c4881f',
  inputBg: '#1c1a18',
  inputBorder: '#312e2b',
  inputText: '#edecea',
  // ≥4.5:1 sobre inputBg — #757069 dava ~3.5:1 (P3 a11y).
  inputPlaceholder: '#8d8780',
  tabBar: '#0d0c0b',
  tabActive: '#fb8b3c',
  tabText: '#8a8580',
  tabTextActive: '#ffffff',
};

const SETTING_KEY = 'theme_preference';

interface ThemeContextValue {
  colors: Colors;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  colors: light,
  preference: 'system',
  setPreference: () => {},
});

export function useThemeProvider() {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  // Load saved preference from SQLite on mount
  useEffect(() => {
    void databaseClient.getSetting(SETTING_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setPreferenceState(saved);
      }
    });
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    void databaseClient.setSetting(SETTING_KEY, p);
  }, []);

  const resolved = preference === 'system' ? system : preference;
  const colors = resolved === 'dark' ? dark : light;

  return useMemo(() => ({ colors, preference, setPreference }), [colors, preference, setPreference]);
}

export function useTheme(): Colors {
  return useContext(ThemeContext).colors;
}

export function useThemePreference() {
  const { preference, setPreference } = useContext(ThemeContext);
  return { preference, setPreference };
}
