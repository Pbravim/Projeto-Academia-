import { describe, expect, it } from 'vitest';

import { normalizeText } from './normalizeText';

describe('normalizeText', () => {
  it('lowercases and trims', () => {
    expect(normalizeText('  Supino Reto  ')).toBe('supino reto');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeText('Supino   Reto')).toBe('supino reto');
  });

  it('removes accents so accented and unaccented are equal', () => {
    expect(normalizeText('Bíceps')).toBe('biceps');
    expect(normalizeText('Remada Curvada')).toBe('remada curvada');
    expect(normalizeText('Elevação Lateral')).toBe('elevacao lateral');
    expect(normalizeText('Panturrilha')).toBe('panturrilha');
  });

  it('treats accented and unaccented variants as the same normalized name', () => {
    expect(normalizeText('Bíceps')).toBe(normalizeText('Biceps'));
    expect(normalizeText('Rosca Direta com Bárra')).toBe(normalizeText('Rosca Direta com Barra'));
  });
});
