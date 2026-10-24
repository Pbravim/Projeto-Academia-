import { describe, expect, it } from 'vitest';

import { progressaoDetalhe, progressaoExecucao, progressaoSerie } from '../../../test/progressaoFixtures';

import { buildProgressaoExercicioViewModel } from './buildProgressaoExercicioViewModel';
import { buildSessaoResumoViewModel } from './buildSessaoResumoViewModel';

describe('progression presenters', () => {
  it('does not repeat a PR for identical sets, handles edits/deletes and ignores warmups/null metrics', () => {
    const series = [progressaoSerie(), progressaoSerie({ id: 'tie', ordem: 2 }),
      progressaoSerie({ id: 'warmup', ordem: 3, tipoSerie: 'aquecimento', cargaKg: 200 }),
      progressaoSerie({ id: 'cardio', ordem: 4, cargaKg: null, repeticoes: null })];
    const vm = buildProgressaoExercicioViewModel(series, [progressaoExecucao()], 'en-US');
    expect(vm.prs.map((p) => [p.serieId, p.tipo, p.value])).toEqual([
      ['new', 'carga', '65 kg'], ['new', 'e1rm', '78 kg'],
    ]);
    expect(vm.topSets).toEqual(['60 kg × 6']);
    expect(buildProgressaoExercicioViewModel([progressaoSerie({ cargaKg: 50 })], [progressaoExecucao()], 'en-US').prs).toEqual([]);
    expect(buildProgressaoExercicioViewModel([], [progressaoExecucao()], 'en-US').prs).toEqual([]);
  });

  it('formats reps at a seen load and marks high-rep estimates as approximate', () => {
    const vm = buildProgressaoExercicioViewModel([progressaoSerie({ cargaKg: 60, repeticoes: 15 })], [progressaoExecucao()], 'pt-BR');
    expect(vm.prs.map((p) => [p.tipo, p.value])).toEqual([['reps@carga', '15 reps @ 60 kg'], ['e1rm', '~90 kg']]);
  });

  it('summary uses previous history, separates strength/volume and excludes segments from best set', () => {
    const detalhe = progressaoDetalhe([progressaoSerie({ segmentos: [{
      id: 'seg', serieId: 'new', ordem: 2, cargaKg: 100, repeticoes: 15, descansoSegundos: null,
    }] })]);
    const vm = buildSessaoResumoViewModel(detalhe, 'en-US', new Map([['exercise', [progressaoExecucao()]]]));
    expect(vm.exercicios[0]).toMatchObject({ volume: 1890, e1rm: 78, e1rmAproximado: false, melhorSerie: '65kg × 6' });
    expect(vm.exercicios[0].prs.map((p) => p.tipo)).toEqual(['carga', 'e1rm']);
    expect(buildSessaoResumoViewModel(detalhe).exercicios[0].prs).toEqual([]);
  });

  it('summary handles high-rep estimates and non-strength sessions', () => {
    expect(buildSessaoResumoViewModel(progressaoDetalhe([progressaoSerie({ repeticoes: 13 })])).exercicios[0].e1rmAproximado).toBe(true);
    const detalhe = progressaoDetalhe([progressaoSerie({ cargaKg: null, repeticoes: null })]);
    detalhe.exercicios[0].sessaoExercicio.trackingTypeSnapshot = 'cardio';
    expect(buildSessaoResumoViewModel(detalhe).exercicios[0]).toMatchObject({ e1rm: null, prs: [], volume: 0 });
  });
});
