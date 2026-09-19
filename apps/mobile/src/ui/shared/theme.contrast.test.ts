import { describe, expect, it, vi } from 'vitest';

import { dark, light } from './theme';

vi.mock('react-native', () => ({ useColorScheme: () => 'light' }));
vi.mock('../../bootstrap/databaseClient', () => ({
  databaseClient: {
    getSetting: vi.fn().mockResolvedValue(null),
    setSetting: vi.fn().mockResolvedValue(undefined),
  },
}));

// WCAG 2.x contrast ratio (relative luminance sRGB) — ver
// https://www.w3.org/TR/WCAG21/#contrast-minimum
function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrast(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

const AA_SMALL_TEXT = 4.5;

describe.each([
  ['light', light],
  ['dark', dark],
])('accentInk — contraste WCAG AA (%s)', (_name, theme) => {
  it.each([
    ['background', theme.background],
    ['card', theme.card],
    ['cardAlt', theme.cardAlt],
    ['accentLight', theme.accentLight],
  ])('accentInk sobre %s tem contraste ≥4.5:1', (_surfaceName, surface) => {
    expect(contrast(theme.accentInk, surface)).toBeGreaterThanOrEqual(AA_SMALL_TEXT);
  });
});

describe('mutação — accentInk = accent no light deve falhar contra card', () => {
  it('accent puro NÃO passa 4.5:1 sobre card (prova que o teste detecta regressão)', () => {
    expect(contrast(light.accent, light.card)).toBeLessThan(AA_SMALL_TEXT);
  });
});
