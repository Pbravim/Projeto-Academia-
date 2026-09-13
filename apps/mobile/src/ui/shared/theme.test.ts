import { describe, expect, it, vi } from 'vitest';

import { act, renderHook } from '../../test/renderHook';

import { useTheme, useThemePreference, useThemeProvider } from './theme';

vi.mock('react-native', () => ({ useColorScheme: () => 'dark' }));
vi.mock('../../bootstrap/databaseClient', () => ({
  databaseClient: {
    getSetting: vi.fn().mockResolvedValue(null),
    setSetting: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('theme', () => {
  it('useTheme() sem Provider usa a paleta padrão (clara) com o token overlay', async () => {
    const { result } = await renderHook(() => useTheme());
    expect(result.current.overlay).toBe('rgba(0,0,0,0.55)');
    expect(result.current.background).toBe('#f4f2f0');
  });

  it('useThemeProvider() resolve o tema do sistema (dark) e permite trocar a preferência', async () => {
    const { result } = await renderHook(() => useThemeProvider());
    await act(async () => { await Promise.resolve(); });

    expect(result.current.colors.background).toBe('#121110'); // dark
    expect(result.current.colors.overlay).toBe('rgba(0,0,0,0.55)');

    await act(async () => { result.current.setPreference('light'); });
    expect(result.current.colors.background).toBe('#f4f2f0'); // light

    const { result: prefResult } = await renderHook(() => useThemePreference());
    expect(prefResult.current.preference).toBe('system');
  });
});
