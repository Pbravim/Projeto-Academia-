import { describe, expect, it, vi } from 'vitest';

import { act, renderHook } from '../../../test/renderHook';

import { useExportarHistorico } from './useExportarHistorico';

function makeDeps(overrides?: Partial<Parameters<typeof useExportarHistorico>[0]>) {
  return {
    exportarHistorico: { execute: vi.fn().mockResolvedValue(undefined) } as never,
    logger: { error: vi.fn(), info: vi.fn() } as never,
    onError: vi.fn(),
    ...overrides,
  };
}

describe('useExportarHistorico', () => {
  it('abrir/fechar togglam formatoVisible', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() => useExportarHistorico(deps));

    await act(async () => { result.current.abrir(); });
    expect(result.current.formatoVisible).toBe(true);

    await act(async () => { result.current.fechar(); });
    expect(result.current.formatoVisible).toBe(false);
  });

  it("exportar('json') chama execute('json') uma vez e fecha o diálogo", async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() => useExportarHistorico(deps));

    await act(async () => { result.current.abrir(); });
    await act(async () => { await result.current.exportar('json'); });

    expect(deps.exportarHistorico.execute).toHaveBeenCalledTimes(1);
    expect(deps.exportarHistorico.execute).toHaveBeenCalledWith('json');
    expect(result.current.formatoVisible).toBe(false);
    expect(result.current.isExporting).toBe(false);
  });

  it('erro chama onError e isExporting volta a false', async () => {
    const deps = makeDeps({
      exportarHistorico: { execute: vi.fn().mockRejectedValue(new Error('falhou')) } as never,
    });
    const { result } = await renderHook(() => useExportarHistorico(deps));

    await act(async () => { await result.current.exportar('csv'); });

    expect(deps.onError).toHaveBeenCalledTimes(1);
    expect(result.current.isExporting).toBe(false);
  });
});
