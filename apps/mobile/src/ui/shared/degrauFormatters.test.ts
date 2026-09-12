import { describe, expect, it } from 'vitest';

import { formatCarga, formatDegrausStack, formatDuracao } from './degrauFormatters';

describe('formatCarga', () => {
  it('inteiro sem casas decimais', () => {
    expect(formatCarga(80)).toBe('80');
  });
  it('decimal com vírgula pt-BR', () => {
    expect(formatCarga(82.5)).toBe('82,5');
  });
  it('decimal com ponto em en-US', () => {
    expect(formatCarga(82.5, 'en-US')).toBe('82.5');
  });
});

describe('formatDuracao', () => {
  it('segundos abaixo de 1 minuto', () => {
    expect(formatDuracao(45)).toBe('45s');
  });
  it('minutos e segundos acima de 60s', () => {
    expect(formatDuracao(90)).toBe('1:30 min');
  });
});

describe('formatDegrausStack', () => {
  it('null sem degraus', () => {
    expect(formatDegrausStack({ cargaKg: 60, repeticoes: 8 }, undefined)).toBeNull();
    expect(formatDegrausStack({ cargaKg: 60, repeticoes: 8 }, [])).toBeNull();
  });

  it('null quando a mãe não tem carga/reps', () => {
    expect(formatDegrausStack({ cargaKg: null, repeticoes: 8 }, [{ cargaKg: 50, repeticoes: 6 }])).toBeNull();
  });

  it('junta mãe + degraus já ordenados', () => {
    const result = formatDegrausStack(
      { cargaKg: 60, repeticoes: 8 },
      [{ cargaKg: 50, repeticoes: 6 }, { cargaKg: 40, repeticoes: 7 }],
    );
    expect(result).toBe('60×8 → 50×6 → 40×7');
  });

  it('ignora degraus sem carga/reps', () => {
    const result = formatDegrausStack(
      { cargaKg: 60, repeticoes: 8 },
      [{ cargaKg: null, repeticoes: null }],
    );
    expect(result).toBe('60×8');
  });
});
