import { describe, expect, it } from 'vitest';

import { SessaoValidationError } from '../errors/SessaoValidationError';

import { SerieSegmento } from './SerieSegmento';

const base = {
  id: 'seg_1',
  serieId: 'serie_1',
  ordem: 2,
  cargaKg: 50,
  repeticoes: 6,
};

describe('SerieSegmento', () => {
  it('creates a valid segmento with ordem >= 2', () => {
    const segmento = SerieSegmento.create(base);

    expect(segmento.toPrimitives()).toEqual({
      id: 'seg_1',
      serieId: 'serie_1',
      ordem: 2,
      cargaKg: 50,
      repeticoes: 6,
      descansoSegundos: null,
    });
  });

  it('accepts an explicit descansoSegundos (rest-pause)', () => {
    const segmento = SerieSegmento.create({ ...base, descansoSegundos: 15 });
    expect(segmento.toPrimitives().descansoSegundos).toBe(15);
  });

  it('rejects ordem = 1 (a serie-mae ja e o degrau 1)', () => {
    expect(() => SerieSegmento.create({ ...base, ordem: 1 })).toThrow(SessaoValidationError);
  });

  it('rejects non-integer ordem', () => {
    expect(() => SerieSegmento.create({ ...base, ordem: 2.5 })).toThrow(SessaoValidationError);
  });

  it('accepts carga 0 for bodyweight exercises', () => {
    const segmento = SerieSegmento.create({ ...base, cargaKg: 0 });
    expect(segmento.toPrimitives().cargaKg).toBe(0);
  });

  it('rejects negative carga', () => {
    expect(() => SerieSegmento.create({ ...base, cargaKg: -1 })).toThrow(SessaoValidationError);
  });

  it('rejects repeticoes < 1', () => {
    expect(() => SerieSegmento.create({ ...base, repeticoes: 0 })).toThrow(SessaoValidationError);
  });

  it('rejects non-integer repeticoes', () => {
    expect(() => SerieSegmento.create({ ...base, repeticoes: 6.5 })).toThrow(SessaoValidationError);
  });

  it('rejects negative descansoSegundos', () => {
    expect(() => SerieSegmento.create({ ...base, descansoSegundos: -1 })).toThrow(SessaoValidationError);
  });

  it('restore() bypasses validation and preserves primitives', () => {
    const segmento = SerieSegmento.restore({
      id: 'seg_2',
      serieId: 'serie_1',
      ordem: 3,
      cargaKg: 40,
      repeticoes: 7,
      descansoSegundos: 0,
    });
    expect(segmento.toPrimitives()).toEqual({
      id: 'seg_2',
      serieId: 'serie_1',
      ordem: 3,
      cargaKg: 40,
      repeticoes: 7,
      descansoSegundos: 0,
    });
  });
});
