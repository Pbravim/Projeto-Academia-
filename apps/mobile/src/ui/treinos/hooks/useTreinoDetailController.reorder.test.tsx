import { describe, expect, it, vi } from 'vitest';

import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import type { TreinoExercicioPrimitives } from '../../../domain/treinos/entities/TreinoExercicio';
import { act,renderHook } from '../../../test/renderHook';

import { type TreinoDetailControllerDependencies,useTreinoDetailController } from './useTreinoDetailController';

// O módulo de i18n puxa expo-localization e o database client do SQLite
vi.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'pt-BR' }] }));
vi.mock('expo-sqlite', () => ({}));

/**
 * Regressão P2 (rodada 3, apêndice E): as setas ↑/↓ não tinham guard de
 * in-flight — dois taps rápidos disparavam reorders concorrentes calculados
 * sobre a lista stale e a segunda gravação usava a ordem antiga.
 */

const treino: TreinoPrimitives = {
  id: 't1',
  name: 'Peito',
  objetivo: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const te = (id: string, ordem: number): TreinoExercicioPrimitives => ({
  id,
  treinoId: 't1',
  exercicioId: `ex-${id}`,
  ordem,
  seriesRecomendadas: null,
  execucoesRecomendadas: null,
  cargaPadrao: null,
  tempoDescansoSegundos: null,
  metodo: 'normal',
  grupoId: null,
  duracaoRecomendadaSegundos: null,
  distanciaRecomendadaMetros: null,
  intensidadeRecomendada: null,
});

const createMockDependencies = (
  reordenarExecute: (input: unknown) => Promise<void>,
): TreinoDetailControllerDependencies => ({
  listTreinoExercicios: { execute: vi.fn().mockResolvedValue([te('a', 1), te('b', 2)]) } as never,
  addExercicioAoTreino: { execute: vi.fn() } as never,
  removeExercicioDoTreino: { execute: vi.fn() } as never,
  reordenarExercicios: { execute: vi.fn(reordenarExecute) } as never,
  updateTreino: { execute: vi.fn() } as never,
  listExercises: { execute: vi.fn().mockResolvedValue([]) } as never,
  updateRecomendacoes: vi.fn(),
  updateMetodoGrupo: vi.fn(),
  listAlternativas: vi.fn().mockResolvedValue([]),
  addAlternativa: vi.fn(),
  removeAlternativa: vi.fn(),
  getSessaoAtiva: vi.fn().mockResolvedValue(null),
  cancelarSessao: vi.fn(),
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } as never,
});

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
};

describe('useTreinoDetailController — guard de reorder concorrente', () => {
  it('segundo tap durante um reorder pendente é ignorado', async () => {
    let resolveFirst!: () => void;
    const pending = new Promise<void>((r) => (resolveFirst = r));
    const executions: unknown[] = [];
    const deps = createMockDependencies(async (input) => {
      executions.push(input);
      if (executions.length === 1) await pending;
    });

    const { result } = await renderHook(() =>
      useTreinoDetailController(treino, deps, vi.fn(), vi.fn()),
    );
    await flush();

    // Dois taps "simultâneos" na seta ↓ do primeiro exercício.
    let p1!: Promise<void>;
    let p2!: Promise<void>;
    await act(async () => {
      p1 = result.current.onMoveDown('a');
      p2 = result.current.onMoveDown('a');
      await Promise.resolve();
    });

    expect(result.current.isReordering).toBe(true);

    await act(async () => {
      resolveFirst();
      await Promise.all([p1, p2]);
    });
    await flush();

    // Apenas UM reorder chegou ao domínio; o segundo tap foi ignorado.
    expect(executions).toHaveLength(1);
    expect(result.current.isReordering).toBe(false);
  });
});
