import { describe, expect, it } from 'vitest';

import { progressaoExecucao } from '../../../test/progressaoFixtures';

import { buildHistoricoProgressaoViewModel } from './buildHistoricoProgressaoViewModel';

describe('history progression', () => {
  it('calculates separate chart metrics, counts segment volume and ignores warmups', () => {
    const ex = progressaoExecucao();
    ex.series[0].segmentos = [{ ordem: 2, cargaKg: 40, repeticoes: 5, descansoSegundos: null }];
    ex.series.push({ ...ex.series[0], id: 'warmup', tipoSerie: 'aquecimento', cargaKg: 500 });
    const vm = buildHistoricoProgressaoViewModel([ex], 'en-US');
    expect(vm.charts.carga.map((p) => p.value)).toEqual([60]);
    expect(vm.charts.volume.map((p) => p.value)).toEqual([560]);
    expect(vm.charts.e1rm.map((p) => p.value)).toEqual([72]);
    expect(vm.records).toContainEqual({ label: 'Best set', value: '60 kg × 6' });
  });

  it('uses all history for PRs, only the latest 14 valid sessions for charts, top five loads for reps', () => {
    const history = Array.from({ length: 20 }, (_, i) => {
      const ex = progressaoExecucao({ sessaoTreinoId: `s${i}`, dataExecucao: `2026-10-${String(i + 1).padStart(2, '0')}T10:00:00Z` });
      ex.series = [{ ...ex.series[0], cargaKg: 100 - i, repeticoes: i === 0 ? 15 : 6 }];
      return ex;
    });
    const vm = buildHistoricoProgressaoViewModel(history.reverse(), 'en-US');
    expect(vm.charts.carga).toHaveLength(14);
    expect(vm.charts.carga[0].value).toBe(94);
    expect(vm.charts.carga.at(-1)?.value).toBe(81);
    expect(vm.records).toContainEqual({ label: 'Maximum load', value: '100 kg' });
    expect(vm.records).toContainEqual({ label: 'Strength (e1RM)', value: '~150 kg' });
    expect(vm.records.filter((r) => r.label === 'Reps at load')).toHaveLength(5);
  });

  it('returns no strength records for empty or warmup-only history', () => {
    expect(buildHistoricoProgressaoViewModel([], 'pt-BR')).toEqual({ charts: { carga: [], volume: [], e1rm: [] }, records: [] });
    const ex = progressaoExecucao();
    ex.series[0].tipoSerie = 'aquecimento';
    expect(buildHistoricoProgressaoViewModel([ex], 'pt-BR').records).toEqual([]);
  });
});
