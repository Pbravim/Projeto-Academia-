import { describe, expect, it, vi } from 'vitest';

import { GetHistoricoAnteriorDaSessaoUseCase } from '../../../application/historico/use-cases/GetHistoricoAnteriorDaSessaoUseCase';
import { InMemoryHistoricoRepository } from '../../../infrastructure/historico/InMemoryHistoricoRepository';
import { progressaoDetalhe, progressaoExecucao, progressaoSerie } from '../../../test/progressaoFixtures';
import { act, renderHook } from '../../../test/renderHook';
import { buildProgressaoExercicioViewModel } from '../presenters/buildProgressaoExercicioViewModel';

import { useHistoricoAnteriorDaSessao } from './useHistoricoAnteriorDaSessao';

describe('session history integration', () => {
  it('uses the real use case/repository and loads once while new sets are logged', async () => {
    const repo = new InMemoryHistoricoRepository();
    repo.seed('exercise', progressaoExecucao());
    const uc = new GetHistoricoAnteriorDaSessaoUseCase(repo);
    const bulk = vi.spyOn(repo, 'getHistoricoExercicios');
    let detalhe = progressaoDetalhe([]);
    const hook = await renderHook(() => useHistoricoAnteriorDaSessao(detalhe, uc));
    expect(hook.result.current.historico?.get('exercise')).toHaveLength(1);
    detalhe = progressaoDetalhe([progressaoSerie()]);
    await hook.rerender();
    const vm = buildProgressaoExercicioViewModel(detalhe.exercicios[0].series, hook.result.current.historico!.get('exercise')!, 'en-US');
    expect(vm.prs.map((p) => p.tipo)).toEqual(['carga', 'e1rm']);
    expect(bulk).toHaveBeenCalledTimes(1);
    await hook.unmount();
  });

  it('distinguishes failed history from an empty baseline', async () => {
    const uc = { execute: vi.fn().mockRejectedValue(new Error('offline database')) } as unknown as GetHistoricoAnteriorDaSessaoUseCase;
    const hook = await renderHook(() => useHistoricoAnteriorDaSessao(progressaoDetalhe(), uc));
    expect(hook.result.current).toEqual({ historico: null, failed: true });
    await hook.unmount();
  });

  it('ignores late results after changing sessions or unmounting', async () => {
    let resolve!: (value: Map<string, []>) => void;
    const first = new Promise<Map<string, []>>((r) => { resolve = r; });
    const uc = { execute: vi.fn().mockReturnValueOnce(first).mockResolvedValueOnce(new Map([['exercise', []]])) } as unknown as GetHistoricoAnteriorDaSessaoUseCase;
    let detalhe = progressaoDetalhe();
    const hook = await renderHook(() => useHistoricoAnteriorDaSessao(detalhe, uc));
    expect(hook.result.current.historico).toBeNull();
    detalhe = { ...detalhe, sessao: { ...detalhe.sessao, id: 'next' } };
    await hook.rerender();
    await act(async () => { resolve(new Map()); });
    expect(hook.result.current.historico?.has('exercise')).toBe(true);
    await hook.unmount();
  });

  it('does not load without a session or a configured use case', async () => {
    const hook = await renderHook(() => useHistoricoAnteriorDaSessao(null));
    expect(hook.result.current.historico).toBeNull();
    await hook.unmount();
  });
});
