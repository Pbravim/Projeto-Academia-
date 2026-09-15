import { describe, expect, it, vi } from 'vitest';

import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import { act, renderHook } from '../../../test/renderHook';

import { type TreinoDetailControllerDependencies,useTreinoDetailController } from './useTreinoDetailController';

vi.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'pt-BR' }] }));
vi.mock('expo-sqlite', () => ({}));

const treino: TreinoPrimitives = {
  id: 't1',
  name: 'Peito',
  objetivo: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function makeDependencies(overrides: Partial<TreinoDetailControllerDependencies> = {}): TreinoDetailControllerDependencies {
  return {
    listTreinoExercicios: { execute: vi.fn().mockResolvedValue([]) } as never,
    addExercicioAoTreino: { execute: vi.fn() } as never,
    removeExercicioDoTreino: { execute: vi.fn() } as never,
    reordenarExercicios: { execute: vi.fn() } as never,
    updateTreino: { execute: vi.fn() } as never,
    listExercises: { execute: vi.fn().mockResolvedValue([]) } as never,
    updateRecomendacoes: vi.fn(),
    updateMetodoGrupo: vi.fn(),
    listAlternativas: vi.fn().mockResolvedValue([]),
    addAlternativa: vi.fn(),
    removeAlternativa: vi.fn(),
    getSessaoAtiva: vi.fn().mockResolvedValue(null),
    cancelarSessao: vi.fn(),
    exportarTreino: { execute: vi.fn().mockResolvedValue({ nomeArquivo: 'treino_peito.json', conteudo: '{}' }) } as never,
    compartilharArquivo: vi.fn().mockResolvedValue(undefined),
    logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } as never,
    ...overrides,
  };
}

const flush = async () => {
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
};

describe('useTreinoDetailController — exportar', () => {
  it('onExportar chama exportarTreino e compartilharArquivo com nomeArquivo/conteudo, alternando isExporting', async () => {
    const deps = makeDependencies();
    const { result } = await renderHook(() => useTreinoDetailController(treino, deps, vi.fn(), vi.fn()));
    await flush();

    expect(result.current.isExporting).toBe(false);

    await act(async () => { await result.current.onExportar(); });

    expect(deps.exportarTreino.execute).toHaveBeenCalledWith('t1');
    expect(deps.compartilharArquivo).toHaveBeenCalledWith('treino_peito.json', '{}');
    expect(result.current.isExporting).toBe(false);
  });

  it('erro no export define errorMessage i18n e loga treino_detail.export_failed', async () => {
    const deps = makeDependencies({
      exportarTreino: { execute: vi.fn().mockRejectedValue(new Error('falhou')) } as never,
    });
    const { result } = await renderHook(() => useTreinoDetailController(treino, deps, vi.fn(), vi.fn()));
    await flush();

    await act(async () => { await result.current.onExportar(); });

    expect(deps.logger.error).toHaveBeenCalledWith('treino_detail.export_failed', expect.any(Error));
    expect(result.current.errorMessage).toBe('Não foi possível exportar o treino.');
    expect(result.current.isExporting).toBe(false);
  });
});
