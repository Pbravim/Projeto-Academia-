import { describe, it, expect, vi } from 'vitest';

// The i18n module pulls expo-localization and the SQLite database client
vi.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'pt-BR' }] }));
vi.mock('expo-sqlite', () => ({}));

import { renderHook, act } from '../../../test/renderHook';
import {
  useTreinoEvolucaoController,
  type TreinoEvolucaoControllerDeps,
} from './useTreinoEvolucaoController';
import type { ExercicioEvolucao } from '../../../application/dashboard/use-cases/GetTreinoEvolucaoUseCase';

const exercicioEvolucaoBase: ExercicioEvolucao = {
  exercicioId: 'ex1',
  exercicioNome: 'Supino',
  groupMuscle: 'peito',
  sessoes: [
    {
      sessaoId: 's1',
      dataHoraInicio: '2026-05-21T10:00:00.000Z',
      melhorOrm: 100,
      series: [
        { cargaKg: 80, repeticoes: 10 },
        { cargaKg: 80, repeticoes: 8 },
      ],
    },
  ],
};

function makeDeps(overrides?: Partial<TreinoEvolucaoControllerDeps>): TreinoEvolucaoControllerDeps {
  return {
    getTreinoEvolucao: { execute: vi.fn().mockResolvedValue([exercicioEvolucaoBase]) } as never,
    logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } as never,
    ...overrides,
  };
}

async function flush() {
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
}

describe('useTreinoEvolucaoController', () => {
  it('loads exercicios on mount for the given treinoId', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() => useTreinoEvolucaoController('t1', deps));

    await flush();

    expect(deps.getTreinoEvolucao.execute).toHaveBeenCalledWith('t1');
    expect(result.current.exercicios).toEqual([exercicioEvolucaoBase]);
    expect(result.current.isLoading).toBe(false);
  });

  it('sets errorMessage when load fails', async () => {
    const deps = makeDeps({
      getTreinoEvolucao: { execute: vi.fn().mockRejectedValue(new Error('db error')) } as never,
    });
    const { result } = await renderHook(() => useTreinoEvolucaoController('t1', deps));

    await flush();

    expect(result.current.exercicios).toEqual([]);
    expect(result.current.errorMessage).toBe('Nao foi possivel carregar a evolucao do treino.');
    expect(result.current.isLoading).toBe(false);
  });
});
