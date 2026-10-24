import { describe, expect, it } from 'vitest';

import type { ExecucaoExercicio, ExecucaoExercicioSerie } from '../historico/repositories/HistoricoRepository';

import { calcularE1RM } from './calcularE1RM';
import { calcularPRs, detectarPRsDaSerie, ultimosTopSets } from './personalRecords';

const serie = (cargaKg: number, repeticoes: number, extra: Partial<ExecucaoExercicioSerie> = {}): ExecucaoExercicioSerie => ({
  id: 'serie', cargaKg, repeticoes, tipoSerie: 'valida', ordem: 1, observacao: null, ...extra,
});
const execucao = (id: string, series: ExecucaoExercicioSerie[], dia = '01'): ExecucaoExercicio => ({
  sessaoTreinoId: id, dataExecucao: `2026-10-${dia}T10:00:00Z`, nomeSnapshot: 'Supino', series,
});

describe('personal records', () => {
  it('uses the demonstrated load for one rep and Epley otherwise', () => {
    expect(calcularE1RM(100, 1)).toBe(100);
    expect(calcularE1RM(60, 10)).toBe(80);
  });

  it('separates load, reps at each load, e1RM and session volume', () => {
    const records = calcularPRs([
      execucao('a', [serie(80, 6), serie(60, 12, { id: 's2' })]),
      execucao('b', [serie(90, 1)], '02'),
    ]);
    expect(records.prCarga).toBe(90);
    expect(records.prE1RM).toBe(96);
    expect(records.prRepsPorCarga).toEqual(new Map([[80, 6], [60, 12], [90, 1]]));
    expect(records.prVolumeSessao).toBe(1200);
    expect(records.melhorSerie).toMatchObject({ cargaKg: 80, repeticoes: 6, e1rm: 96 });
  });

  it('ignores warmups and invalid metrics, counts segments only for volume', () => {
    const records = calcularPRs([execucao('a', [
      serie(300, 10, { tipoSerie: 'aquecimento' }),
      serie(Number.NaN, 5), serie(100, 0), serie(-10, 5),
      serie(50, 6, { segmentos: [{ ordem: 2, cargaKg: 200, repeticoes: 20, descansoSegundos: null }] }),
    ])]);
    expect(records.prCarga).toBe(50);
    expect(records.prE1RM).toBe(60);
    expect(records.prVolumeSessao).toBe(4300);
    expect(records.prRepsPorCarga.has(200)).toBe(false);
  });

  it('has no records without valid sets and respects the as-of cutoff', () => {
    expect(calcularPRs([])).toMatchObject({ prCarga: null, prE1RM: null, prVolumeSessao: null, melhorSerie: null });
    expect(calcularPRs([execucao('a', [serie(50, 5)]), execucao('b', [serie(100, 5)], '03')],
      new Date('2026-10-02T00:00:00Z')).prCarga).toBe(50);
  });

  it('requires strict improvement; a new load has no reps-at-load record', () => {
    const history = [execucao('a', [serie(60, 6)])];
    expect(detectarPRsDaSerie(serie(60, 6), history)).toEqual([]);
    expect(detectarPRsDaSerie(serie(60, 7), history)).toEqual(['reps@carga', 'e1rm']);
    expect(detectarPRsDaSerie(serie(65, 6), history)).toEqual(['carga', 'e1rm']);
    expect(detectarPRsDaSerie(serie(100, 10, { tipoSerie: 'aquecimento' }), history)).toEqual([]);
    expect(detectarPRsDaSerie(serie(60, 6), [])).toEqual([]);
  });

  it('selects top sets from two distinct completed sessions, independent of input order', () => {
    const history = [
      execucao('old', [serie(60, 6)], '01'),
      execucao('recent', [serie(80, 2)], '03'),
      execucao('middle', [serie(70, 4)], '02'),
      execucao('recent', [serie(65, 12, { id: 'other' })], '03'),
      execucao('warmup', [serie(300, 1, { tipoSerie: 'aquecimento' })], '04'),
    ];
    expect(ultimosTopSets(history).map((s) => [s.sessaoTreinoId, s.cargaKg, s.repeticoes]))
      .toEqual([['recent', 65, 12], ['middle', 70, 4]]);
    expect(history[0].sessaoTreinoId).toBe('old');
  });
});
