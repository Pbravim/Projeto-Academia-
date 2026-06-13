import { describe, expect, it } from 'vitest';
import { TreinoExercicio } from './TreinoExercicio';

function base() {
  return {
    id: 'te1', treinoId: 't1', exercicioId: 'ex1',
    ordem: 0, seriesRecomendadas: null, execucoesRecomendadas: null,
    cargaPadrao: null, tempoDescansoSegundos: null, metodo: 'normal' as const, grupoId: null,
    duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null,
  };
}

describe('TreinoExercicio.create', () => {
  it('creates with valid props', () => {
    expect(() => TreinoExercicio.create(base())).not.toThrow();
  });

  it('throws when ordem is negative', () => {
    expect(() => TreinoExercicio.create({ ...base(), ordem: -1 })).toThrow();
  });

  it('throws when cargaPadrao is negative', () => {
    expect(() => TreinoExercicio.create({ ...base(), cargaPadrao: -5 })).toThrow();
  });

  it('throws when seriesRecomendadas is zero', () => {
    expect(() => TreinoExercicio.create({ ...base(), seriesRecomendadas: 0 })).toThrow();
  });

  it('allows null optional fields', () => {
    expect(() => TreinoExercicio.create(base())).not.toThrow();
  });
});

describe('TreinoExercicio.restore', () => {
  it('does NOT throw for negative ordem (DB data trusted)', () => {
    expect(() => TreinoExercicio.restore({ ...base(), ordem: -1 })).not.toThrow();
  });
});
