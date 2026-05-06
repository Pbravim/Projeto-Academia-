import { createContext, useContext, useEffect, useState } from 'react';
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

const light: Colors = {
  background: '#f3f0e8',
  card: '#fbf9f2',
  cardAlt: '#eef1e7',
  cardBorder: '#e1dccd',
  hero: '#20352c',
  heroText: '#f8f4ea',
  heroSubtext: '#b8c9a9',
  heroDescription: '#dde7d3',
  textPrimary: '#20352c',
  textSecondary: '#66725f',
  textMeta: '#40584d',
  textLabel: '#31463d',
  accent: '#c96f2d',
  accentText: '#fff8f2',
  accentLight: '#d4f0dc',
  error: '#a1362e',
  errorBg: '#f0dbd8',
  success: '#2c6b42',
  successBg: '#c5e0b8',
  warning: '#92400e',
  warningBg: '#fef3c7',
  warningBorder: '#f59e0b',
  inputBg: '#ffffff',
  inputBorder: '#d4cfbf',
  inputText: '#1d271f',
  inputPlaceholder: '#7f856f',
  tabBar: '#20352c',
  tabActive: '#c96f2d',
  tabText: '#b8c9a9',
  tabTextActive: '#fff8f2',
};

const dark: Colors = {
  background: '#0f1a12',
  card: '#172215',
  cardAlt: '#1e2e1e',
  cardBorder: '#2a3e2a',
  hero: '#1c3222',
  heroText: '#eef4ea',
  heroSubtext: '#7aab84',
  heroDescription: '#a8c8b0',
  textPrimary: '#e4f0e0',
  textSecondary: '#7aab84',
  textMeta: '#5e8e68',
  textLabel: '#8ab894',
  accent: '#d4854c',
  accentText: '#fff4ed',
  accentLight: '#1e3e28',
  error: '#e06456',
  errorBg: '#3a1a16',
  success: '#4caa72',
  successBg: '#1a3a24',
  warning: '#e8a740',
  warningBg: '#2a2010',
  warningBorder: '#b87c20',
  inputBg: '#172215',
  inputBorder: '#2a3e2a',
  inputText: '#e4f0e0',
  inputPlaceholder: '#4a6e52',
  tabBar: '#0f1a12',
  tabActive: '#c96f2d',
  tabText: '#5a8462',
  tabTextActive: '#fff4ed',
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

  const setPreference = (p: ThemePreference) => {
    setPreferenceState(p);
    void databaseClient.setSetting(SETTING_KEY, p);
  };

  const resolved = preference === 'system' ? system : preference;
  const colors = resolved === 'dark' ? dark : light;

  return { colors, preference, setPreference };
}

export function useTheme(): Colors {
  return useContext(ThemeContext).colors;
}

export function useThemePreference() {
  const { preference, setPreference } = useContext(ThemeContext);
  return { preference, setPreference };
}
