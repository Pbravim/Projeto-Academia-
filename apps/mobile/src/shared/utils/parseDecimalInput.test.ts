import { describe, expect, it } from 'vitest';

import { parseDecimalInput } from './parseDecimalInput';

describe('parseDecimalInput', () => {
  it('converte vírgula em ponto decimal', () => {
    expect(parseDecimalInput('1,5')).toBe(1.5);
  });

  it('aceita ponto como separador', () => {
    expect(parseDecimalInput('2.75')).toBe(2.75);
  });

  it('aceita inteiros', () => {
    expect(parseDecimalInput('80')).toBe(80);
  });

  it('retorna NaN para texto vazio', () => {
    expect(parseDecimalInput('')).toBeNaN();
  });

  it('retorna NaN para texto não numérico', () => {
    expect(parseDecimalInput('abc')).toBeNaN();
  });
});
