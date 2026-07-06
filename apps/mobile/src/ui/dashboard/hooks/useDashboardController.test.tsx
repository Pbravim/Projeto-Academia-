import { describe, it, expect, vi } from 'vitest';

// The i18n module pulls expo-localization and the SQLite database client
vi.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'pt-BR' }] }));
vi.mock('expo-sqlite', () => ({}));

import { renderHook, act } from '../../../test/renderHook';
import {
  useDashboardController,
  type DashboardControllerDependencies,
} from './useDashboardController';
import type { DashboardStats } from '../../../application/dashboard/use-cases/GetDashboardStatsUseCase';

const statsBase: DashboardStats = {
  totalSessoes: 10,
  sessoesUltimoMes: 3,
  aderenciaSemanal: [],
  aderenciaMensal: [],
  aderenciaAnual: [],
  evolucaoPorTreino: [],
  recordesPessoais: [],
};

function makeDeps(overrides?: Partial<DashboardControllerDependencies>): DashboardControllerDependencies {
  return {
    getDashboardStats: { execute: vi.fn().mockResolvedValue(statsBase) } as never,
    resetHistorico: { execute: vi.fn().mockResolvedValue(undefined) } as never,
    exportarHistorico: { execute: vi.fn().mockResolvedValue(undefined) } as never,
    arquivarSessao: { execute: vi.fn().mockResolvedValue(1) } as never,
    desarquivarSessao: { execute: vi.fn().mockResolvedValue(1) } as never,
    deletarSessao: { execute: vi.fn().mockResolvedValue(undefined) } as never,
    logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } as never,
    ...overrides,
  };
}

async function flush() {
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
}

describe('useDashboardController', () => {
  it('loads stats on mount', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() => useDashboardController(deps));

    await flush();

    expect(deps.getDashboardStats.execute).toHaveBeenCalledTimes(1);
    expect(result.current.stats).toEqual(statsBase);
    expect(result.current.isLoading).toBe(false);
  });

  it('sets errorMessage when getDashboardStats throws', async () => {
    const deps = makeDeps({
      getDashboardStats: { execute: vi.fn().mockRejectedValue(new Error('db error')) } as never,
    });
    const { result } = await renderHook(() => useDashboardController(deps));

    await flush();

    expect(result.current.stats).toBeNull();
    expect(result.current.errorMessage).toBe('Nao foi possivel carregar as estatisticas.');
    expect(result.current.isLoading).toBe(false);
  });

  it('onReset calls resetHistorico then reloads stats', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() => useDashboardController(deps));

    await flush();
    expect(deps.getDashboardStats.execute).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.onReset();
    });
    await flush();

    expect(deps.resetHistorico.execute).toHaveBeenCalledTimes(1);
    expect(deps.getDashboardStats.execute).toHaveBeenCalledTimes(2);
  });

  it('onExportar calls exportarHistorico once', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() => useDashboardController(deps));

    await flush();

    await act(async () => {
      await result.current.onExportar();
    });
    await flush();

    expect(deps.exportarHistorico.execute).toHaveBeenCalledTimes(1);
  });

  it('onDeletarSessao calls deletarSessao with the sessaoId then reloads', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() => useDashboardController(deps));

    await flush();
    expect(deps.getDashboardStats.execute).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.onDeletarSessao('sessao-42');
    });
    await flush();

    expect(deps.deletarSessao.execute).toHaveBeenCalledTimes(1);
    expect(deps.deletarSessao.execute).toHaveBeenCalledWith('sessao-42');
    expect(deps.getDashboardStats.execute).toHaveBeenCalledTimes(2);
  });

  it('onArquivarSessao calls arquivarSessao with the sessaoId then reloads', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() => useDashboardController(deps));

    await flush();
    expect(deps.getDashboardStats.execute).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.onArquivarSessao('sessao-99');
    });
    await flush();

    expect(deps.arquivarSessao.execute).toHaveBeenCalledTimes(1);
    expect(deps.arquivarSessao.execute).toHaveBeenCalledWith('sessao-99');
    expect(deps.getDashboardStats.execute).toHaveBeenCalledTimes(2);
  });
});
