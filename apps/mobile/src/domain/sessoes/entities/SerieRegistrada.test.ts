import { describe, expect, it } from 'vitest';

import { SerieRegistrada } from './SerieRegistrada';
import { SessaoValidationError } from '../errors/SessaoValidationError';

const base = {
  id: 'serie_1',
  sessaoExercicioId: 'se_1',
  tipoSerie: 'valida' as const,
  ordem: 1,
  cargaKg: 102.5,
  repeticoes: 8,
};

describe('SerieRegistrada', () => {
  it('creates a valid serie with decimal carga (default reps_load)', () => {
    const serie = SerieRegistrada.create({ ...base, cargaKg: 102.5, repeticoes: 8 });

    expect(serie.toPrimitives()).toMatchObject({
      cargaKg: 102.5,
      repeticoes: 8,
      observacao: null,
      duracaoSegundos: null,
      distanciaMetros: null,
      intensidade: null,
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

  it('creates a valid cardio serie with duracaoSegundos', () => {
    const serie = SerieRegistrada.create({
      id: 'serie_cardio_1',
      sessaoExercicioId: 'se_1',
      ordem: 1,
      trackingType: 'cardio',
      duracaoSegundos: 600,
    });

    expect(serie.toPrimitives()).toMatchObject({
      cargaKg: null,
      repeticoes: null,
      duracaoSegundos: 600,
      distanciaMetros: null,
      intensidade: null,
      observacao: null,
    });
  });

  it('creates a valid cardio serie with duracaoSegundos and optional intensidade', () => {
    const serie = SerieRegistrada.create({
      id: 'serie_cardio_2',
      sessaoExercicioId: 'se_1',
      ordem: 1,
      trackingType: 'cardio',
      duracaoSegundos: 1200,
      intensidade: 8.5,
    });

    expect(serie.toPrimitives()).toMatchObject({
      cargaKg: null,
      repeticoes: null,
      duracaoSegundos: 1200,
      intensidade: 8.5,
      distanciaMetros: null,
      observacao: null,
    });
  });

  it('creates a valid cardio serie with duracaoSegundos and all optional metrics', () => {
    const serie = SerieRegistrada.create({
      id: 'serie_cardio_3',
      sessaoExercicioId: 'se_1',
      ordem: 1,
      trackingType: 'cardio',
      duracaoSegundos: 900,
      intensidade: 10,
      distanciaMetros: 2000,
    });

    expect(serie.toPrimitives()).toMatchObject({
      cargaKg: null,
      repeticoes: null,
      duracaoSegundos: 900,
      intensidade: 10,
      distanciaMetros: 2000,
      observacao: null,
    });
  });

  it('rejects cardio without duracaoSegundos', () => {
    expect(() =>
      SerieRegistrada.create({
        id: 'serie_cardio_bad',
        sessaoExercicioId: 'se_1',
        ordem: 1,
        trackingType: 'cardio',
      })
    ).toThrow(SessaoValidationError);
  });

  it('rejects cardio with zero duracaoSegundos', () => {
    expect(() =>
      SerieRegistrada.create({
        id: 'serie_cardio_bad2',
        sessaoExercicioId: 'se_1',
        ordem: 1,
        trackingType: 'cardio',
        duracaoSegundos: 0,
      })
    ).toThrow(SessaoValidationError);
  });

  it('rejects cardio with negative intensidade', () => {
    expect(() =>
      SerieRegistrada.create({
        id: 'serie_cardio_bad3',
        sessaoExercicioId: 'se_1',
        ordem: 1,
        trackingType: 'cardio',
        duracaoSegundos: 600,
        intensidade: -1,
      })
    ).toThrow(SessaoValidationError);
  });

  it('rejects cardio with negative distanciaMetros', () => {
    expect(() =>
      SerieRegistrada.create({
        id: 'serie_cardio_bad4',
        sessaoExercicioId: 'se_1',
        ordem: 1,
        trackingType: 'cardio',
        duracaoSegundos: 600,
        distanciaMetros: -100,
      })
    ).toThrow(SessaoValidationError);
  });

  it('creates a valid hold serie with duracaoSegundos', () => {
    const serie = SerieRegistrada.create({
      id: 'serie_hold_1',
      sessaoExercicioId: 'se_1',
      ordem: 1,
      trackingType: 'hold',
      duracaoSegundos: 120,
    });

    expect(serie.toPrimitives()).toMatchObject({
      cargaKg: null,
      repeticoes: null,
      duracaoSegundos: 120,
      distanciaMetros: null,
      intensidade: null,
      observacao: null,
    });
  });

  it('rejects hold without duracaoSegundos', () => {
    expect(() =>
      SerieRegistrada.create({
        id: 'serie_hold_bad',
        sessaoExercicioId: 'se_1',
        ordem: 1,
        trackingType: 'hold',
      })
    ).toThrow(SessaoValidationError);
  });

  it('creates a valid reps_only serie with repeticoes', () => {
    const serie = SerieRegistrada.create({
      id: 'serie_reps_1',
      sessaoExercicioId: 'se_1',
      ordem: 1,
      trackingType: 'reps_only',
      repeticoes: 20,
    });

    expect(serie.toPrimitives()).toMatchObject({
      cargaKg: null,
      repeticoes: 20,
      duracaoSegundos: null,
      distanciaMetros: null,
      intensidade: null,
      observacao: null,
    });
  });

  it('rejects reps_only without repeticoes', () => {
    expect(() =>
      SerieRegistrada.create({
        id: 'serie_reps_bad',
        sessaoExercicioId: 'se_1',
        ordem: 1,
        trackingType: 'reps_only',
      })
    ).toThrow(SessaoValidationError);
  });

  it('rejects reps_only with zero repeticoes', () => {
    expect(() =>
      SerieRegistrada.create({
        id: 'serie_reps_bad2',
        sessaoExercicioId: 'se_1',
        ordem: 1,
        trackingType: 'reps_only',
        repeticoes: 0,
      })
    ).toThrow(SessaoValidationError);
  });
});
