import { describe, expect, it } from 'vitest';

import { SerieRegistrada } from './SerieRegistrada';
import { SessaoValidationError } from '../errors/SessaoValidationError';

const base = {
  id: 'serie_1',
  sessaoExercicioId: 'se_1',
  tipoSerie: 'valida' as const,
  ordem: 1,
};

describe('SerieRegistrada', () => {
  it('creates a valid serie with decimal carga', () => {
    const serie = SerieRegistrada.create({ ...base, cargaKg: 102.5, repeticoes: 8 });

    expect(serie.toPrimitives()).toMatchObject({
      cargaKg: 102.5,
      repeticoes: 8,
      observacao: null,
    });
  });

  it('accepts carga 0 for bodyweight exercises', () => {
    const serie = SerieRegistrada.create({ ...base, cargaKg: 0, repeticoes: 15 });
    expect(serie.toPrimitives().cargaKg).toBe(0);
  });

  it('normalizes empty observacao to null', () => {
    const serie = SerieRegistrada.create({ ...base, cargaKg: 50, repeticoes: 10, observacao: '  ' });
    expect(serie.toPrimitives().observacao).toBeNull();
  });

  it('rejects negative carga', () => {
    expect(() =>
      SerieRegistrada.create({ ...base, cargaKg: -1, repeticoes: 10 })
    ).toThrow(SessaoValidationError);
  });

  it('rejects zero repeticoes', () => {
    expect(() =>
      SerieRegistrada.create({ ...base, cargaKg: 50, repeticoes: 0 })
    ).toThrow(SessaoValidationError);
  });

  it('rejects fractional repeticoes', () => {
    expect(() =>
      SerieRegistrada.create({ ...base, cargaKg: 50, repeticoes: 1.5 })
    ).toThrow(SessaoValidationError);
  });
});
