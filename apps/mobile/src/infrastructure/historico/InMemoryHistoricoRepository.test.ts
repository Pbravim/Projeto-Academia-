import { describe, expect, it } from 'vitest';
import { InMemoryHistoricoRepository } from './InMemoryHistoricoRepository';
import type { ExecucaoExercicio } from '../../domain/historico/repositories/HistoricoRepository';

function makeExecucao(
  dataExecucao: string,
  series: { tipoSerie: 'valida' | 'aquecimento'; cargaKg: number; repeticoes: number }[]
): ExecucaoExercicio {
  return {
    sessaoTreinoId: 'sessao-1',
    dataExecucao,
    nomeSnapshot: 'Exercicio Teste',
    series: series.map((s, i) => ({
      id: `serie-${i}`,
      tipoSerie: s.tipoSerie,
      cargaKg: s.cargaKg,
      repeticoes: s.repeticoes,
      observacao: null,
      ordem: i,
    })),
  };
}

describe('InMemoryHistoricoRepository.getUltimasExecucoesValidas', () => {
  it('returns the best serie per exercicio', async () => {
    const repo = new InMemoryHistoricoRepository();

    repo.seed(
      'ex1',
      makeExecucao('2024-01-01', [
        { tipoSerie: 'valida', cargaKg: 60, repeticoes: 10 },
        { tipoSerie: 'valida', cargaKg: 70, repeticoes: 8 },
      ])
    );
    repo.seed(
      'ex2',
      makeExecucao('2024-01-01', [
        { tipoSerie: 'aquecimento', cargaKg: 20, repeticoes: 15 },
        { tipoSerie: 'valida', cargaKg: 80, repeticoes: 5 },
      ])
    );

    const result = await repo.getUltimasExecucoesValidas();

    expect(result.size).toBe(2);

    // ex1: best series is the one with higher 1RM estimate
    // 60 * (1 + 10/30) = 80, 70 * (1 + 8/30) ≈ 88.67 → 70kg/8reps wins
    const ex1 = result.get('ex1');
    expect(ex1).toBeDefined();
    expect(ex1?.cargaKg).toBe(70);
    expect(ex1?.repeticoes).toBe(8);

    // ex2: only valid serie is 80kg/5reps
    const ex2 = result.get('ex2');
    expect(ex2).toBeDefined();
    expect(ex2?.cargaKg).toBe(80);
    expect(ex2?.repeticoes).toBe(5);
  });

  it('excludes exercises with only aquecimento series', async () => {
    const repo = new InMemoryHistoricoRepository();

    repo.seed(
      'ex1',
      makeExecucao('2024-01-01', [
        { tipoSerie: 'aquecimento', cargaKg: 20, repeticoes: 15 },
        { tipoSerie: 'aquecimento', cargaKg: 30, repeticoes: 10 },
      ])
    );

    const result = await repo.getUltimasExecucoesValidas();

    expect(result.has('ex1')).toBe(false);
    expect(result.size).toBe(0);
  });

  it('uses the most recent execucao when multiple exist for the same exercicio', async () => {
    const repo = new InMemoryHistoricoRepository();

    // older record with higher weight — should NOT be selected
    repo.seed(
      'ex1',
      makeExecucao('2024-01-01', [{ tipoSerie: 'valida', cargaKg: 100, repeticoes: 10 }])
    );
    // newer record with lower weight — SHOULD be selected
    repo.seed(
      'ex1',
      makeExecucao('2024-06-01', [{ tipoSerie: 'valida', cargaKg: 80, repeticoes: 8 }])
    );

    const result = await repo.getUltimasExecucoesValidas();

    expect(result.size).toBe(1);
    const ex1 = result.get('ex1');
    expect(ex1?.dataExecucao).toBe('2024-06-01');
    expect(ex1?.cargaKg).toBe(80);
  });

  it('returns empty map when no records exist', async () => {
    const repo = new InMemoryHistoricoRepository();
    const result = await repo.getUltimasExecucoesValidas();
    expect(result.size).toBe(0);
  });
});
