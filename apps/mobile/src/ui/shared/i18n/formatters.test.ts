import { describe, expect, it } from 'vitest';

import {
  formatShortDate,
  formatFullDate,
  formatMediumDate,
  formatCompactDate,
  formatTime,
  formatNumber,
} from './formatters';

const ISO = '2026-07-04T10:00:00.000Z';

describe('formatShortDate', () => {
  it('formata dia/mes em pt-BR (DD/MM)', () => {
    expect(formatShortDate(ISO, 'pt-BR')).toBe('04/07');
  });

  it('formata mes/dia em en-US (MM/DD)', () => {
    expect(formatShortDate(ISO, 'en-US')).toBe('07/04');
  });

  it('aceita um objeto Date diretamente', () => {
    expect(formatShortDate(new Date(ISO), 'pt-BR')).toBe('04/07');
  });
});

describe('formatFullDate', () => {
  it('formata dia/mes/ano em pt-BR', () => {
    expect(formatFullDate(ISO, 'pt-BR')).toBe('04/07/2026');
  });

  it('formata mes/dia/ano em en-US', () => {
    expect(formatFullDate(ISO, 'en-US')).toBe('07/04/2026');
  });
});

describe('formatMediumDate', () => {
  it('formata dia + mes abreviado + ano em pt-BR', () => {
    expect(formatMediumDate(ISO, 'pt-BR')).toBe('04 de jul. de 2026');
  });
});

describe('formatCompactDate', () => {
  it('formata dia/mes/ano com 2 digitos de ano em pt-BR', () => {
    expect(formatCompactDate(ISO, 'pt-BR')).toBe('04/07/26');
  });
});

describe('formatTime', () => {
  it('formata hora:minuto em pt-BR', () => {
    expect(formatTime(ISO, 'pt-BR')).toBe('10:00');
  });
});

describe('formatNumber', () => {
  it('usa ponto como separador de milhar em pt-BR', () => {
    expect(formatNumber(1240, 'pt-BR')).toBe('1.240');
  });

  it('usa virgula como separador de milhar em en-US', () => {
    expect(formatNumber(1240, 'en-US')).toBe('1,240');
  });
});
