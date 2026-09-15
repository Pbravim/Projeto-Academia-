import { describe, expect, it } from 'vitest';

import type { SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';
import type { SerieRegistradaPrimitives } from '../../../domain/sessoes/entities/SerieRegistrada';

import { templateFromSessao } from './templateFromSessao';

function makeSessaoExercicio(overrides: Partial<SessaoExercicioPrimitives> = {}): SessaoExercicioPrimitives {
  return {
    id: 'se_1',
    sessaoTreinoId: 'sessao_1',
    exercicioId: 'ex_1',
    ordem: 1,
    nomeSnapshot: 'Supino',
    grupoMuscularSnapshot: 'Peito',
    categoriaSnapshot: 'Composto',
    equipamentoSnapshot: null,
    musculoAlvoSnapshot: [],
    movementPatternSnapshot: null,
    realizado: true,
    seriesRecomendadas: null,
    execucoesRecomendadas: null,
    cargaPadrao: null,
    tempoDescansoSegundos: 90,
    metodo: 'normal',
    grupoId: null,
    trackingTypeSnapshot: 'reps_load',
    duracaoRecomendadaSegundos: null,
    distanciaRecomendadaMetros: null,
    intensidadeRecomendada: null,
    substituidoPorExercicioId: null,
    substituicaoMotivo: null,
    nomeOriginalSnapshot: null,
    ...overrides,
  };
}

function makeSerie(overrides: Partial<SerieRegistradaPrimitives> = {}): SerieRegistradaPrimitives {
  return {
    id: `s_${Math.random()}`,
    sessaoExercicioId: 'se_1',
    tipoSerie: 'valida',
    ordem: 1,
    cargaKg: 100,
    repeticoes: null,
    observacao: null,
    duracaoSegundos: null,
    distanciaMetros: null,
    intensidade: null,
    ...overrides,
  };
}

describe('templateFromSessao (#33 — D3)', () => {
  it('(a) media arredondada das repeticoes das series validas', () => {
    const se = makeSessaoExercicio();
    const series = [
      makeSerie({ ordem: 1, repeticoes: 10 }),
      makeSerie({ ordem: 2, repeticoes: 8 }),
      makeSerie({ ordem: 3, repeticoes: 8 }),
    ];

    const result = templateFromSessao(se, series);

    expect(result.seriesRecomendadas).toBe(3);
    expect(result.execucoesRecomendadas).toBe(9);
  });

  it('(b) ignora serie de aquecimento na media e na contagem', () => {
    const se = makeSessaoExercicio();
    const series = [
      makeSerie({ ordem: 1, tipoSerie: 'aquecimento', repeticoes: 20 }),
      makeSerie({ ordem: 2, repeticoes: 10 }),
      makeSerie({ ordem: 3, repeticoes: 10 }),
    ];

    const result = templateFromSessao(se, series);

    expect(result.seriesRecomendadas).toBe(2);
    expect(result.execucoesRecomendadas).toBe(10);
  });

  it('(c) sem series validas devolve seriesRecomendadas e execucoesRecomendadas null', () => {
    const se = makeSessaoExercicio();

    const result = templateFromSessao(se, []);

    expect(result.seriesRecomendadas).toBeNull();
    expect(result.execucoesRecomendadas).toBeNull();
  });

  it('(d) cardio usa media arredondada da duracao e reps fica null', () => {
    const se = makeSessaoExercicio({ trackingTypeSnapshot: 'cardio' });
    const series = [
      makeSerie({ ordem: 1, cargaKg: null, duracaoSegundos: 600 }),
      makeSerie({ ordem: 2, cargaKg: null, duracaoSegundos: 720 }),
    ];

    const result = templateFromSessao(se, series);

    expect(result.duracaoRecomendadaSegundos).toBe(660);
    expect(result.execucoesRecomendadas).toBeNull();
  });

  it('(e) cargaPadrao e sempre null mesmo com series carregadas', () => {
    const se = makeSessaoExercicio();
    const series = [makeSerie({ cargaKg: 100, repeticoes: 10 })];

    const result = templateFromSessao(se, series);

    expect(result.cargaPadrao).toBeNull();
  });

  it('(f) copia metodo, grupoId e tempoDescansoSegundos do SessaoExercicio', () => {
    const se = makeSessaoExercicio({ metodo: 'drop_set', grupoId: 'grupo_a', tempoDescansoSegundos: 45 });

    const result = templateFromSessao(se, []);

    expect(result.metodo).toBe('drop_set');
    expect(result.grupoId).toBe('grupo_a');
    expect(result.tempoDescansoSegundos).toBe(45);
  });
});
