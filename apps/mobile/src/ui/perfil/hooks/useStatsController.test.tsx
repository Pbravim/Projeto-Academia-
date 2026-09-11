import { describe, expect, it, vi } from 'vitest';

import type { DashboardStats } from '../../../application/dashboard/use-cases/GetDashboardStatsUseCase';
import { act,renderHook } from '../../../test/renderHook';

import { useStatsController } from './useStatsController';

const statsBase: DashboardStats = {
  totalSessoes: 10,
  sessoesUltimoMes: 3,
  aderenciaSemanal: [],
  aderenciaMensal: [],
  aderenciaAnual: [],
  evolucaoPorTreino: [],
  recordesPessoais: [],
};

function makeDeps(overrides?: any) {
  return {
    execute: vi.fn().mockResolvedValue(statsBase),
    ...overrides,
  };
}

async function flush() {
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
}

describe('useStatsController', () => {
  it('loads stats on mount', async () => {
    const getDashboardStats = makeDeps();
    const { result } = await renderHook(() => useStatsController(getDashboardStats as never));

    await flush();

    expect(getDashboardStats.execute).toHaveBeenCalledTimes(1);
    expect(result.current.stats).toEqual(statsBase);
    expect(result.current.isLoading).toBe(false);
  });

  it('starts in loading state', async () => {
    let resolvePromise: (value: DashboardStats) => void;
    const pendingPromise = new Promise<DashboardStats>((resolve) => {
      resolvePromise = resolve;
    });

    const getDashboardStats = makeDeps({
      execute: vi.fn().mockReturnValue(pendingPromise),
    });

    const { result } = await renderHook(() => useStatsController(getDashboardStats as never));

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePromise!(statsBase);
      await Promise.resolve();
    });

    await flush();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.stats).toEqual(statsBase);
  });
});
