import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '../../../test/renderHook';
import { useTreinoListController, type TreinoListControllerDependencies } from './useTreinoListController';
import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import { TreinoValidationError } from '../../../domain/treinos/errors/TreinoValidationError';

const treinoA: TreinoPrimitives = {
  id: 't1',
  name: 'Peito',
  objetivo: 'Hipertrofia',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const createMockDependencies = (overrides?: Partial<TreinoListControllerDependencies>): TreinoListControllerDependencies => ({
  createTreino: {
    execute: vi.fn().mockResolvedValue(treinoA),
  } as never,
  listTreinos: {
    execute: vi.fn().mockResolvedValue([treinoA]),
  } as never,
  deleteTreino: {
    execute: vi.fn().mockResolvedValue(undefined),
  } as never,
  duplicarTreino: {
    execute: vi.fn().mockResolvedValue(treinoA),
  } as never,
  countExerciciosByTreino: vi.fn().mockResolvedValue({ t1: 5 }),
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  } as never,
  ...overrides,
});

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
};

describe('useTreinoListController', () => {
  it('loads treinos on mount', async () => {
    const dependencies = createMockDependencies();
    const onSelectTreino = vi.fn();

    const { result } = await renderHook(() =>
      useTreinoListController(dependencies, onSelectTreino)
    );

    await flush();

    expect(result.current.treinos).toEqual([treinoA]);
    expect(result.current.isLoading).toBe(false);
    expect(dependencies.listTreinos.execute).toHaveBeenCalledTimes(1);
  });

  it('treinosVazios marks treinos with count 0', async () => {
    const dependencies = createMockDependencies({
      countExerciciosByTreino: vi.fn().mockResolvedValue({ t1: 0 }),
    });
    const onSelectTreino = vi.fn();

    const { result } = await renderHook(() =>
      useTreinoListController(dependencies, onSelectTreino)
    );

    await flush();

    expect(result.current.treinosVazios.has('t1')).toBe(true);
  });

  it('onSubmit with empty name shows validation error', async () => {
    const mockCreateTreino = {
      execute: vi.fn().mockRejectedValue(new TreinoValidationError('Nome obrigatorio')),
    } as never;
    const dependencies = createMockDependencies({
      createTreino: mockCreateTreino,
    });
    const onSelectTreino = vi.fn();

    const { result } = await renderHook(() =>
      useTreinoListController(dependencies, onSelectTreino)
    );

    await flush();

    await act(async () => {
      result.current.onChangeField('name', '');
    });

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(result.current.errorMessage).toBe('Nome obrigatorio');
  });

  it('onSubmit success clears draft and reloads', async () => {
    const dependencies = createMockDependencies();
    const onSelectTreino = vi.fn();

    const { result } = await renderHook(() =>
      useTreinoListController(dependencies, onSelectTreino)
    );

    await flush();

    await act(async () => {
      result.current.onChangeField('name', 'Novo');
    });

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(dependencies.createTreino.execute).toHaveBeenCalledWith({
      name: 'Novo',
      objetivo: undefined,
    });
    expect(dependencies.listTreinos.execute).toHaveBeenCalledTimes(2);
    expect(result.current.draft.name).toBe('');
    expect(onSelectTreino).toHaveBeenCalledWith(treinoA);
  });

  it('onDelete calls deleteTreino and reloads', async () => {
    const dependencies = createMockDependencies();
    const onSelectTreino = vi.fn();

    const { result } = await renderHook(() =>
      useTreinoListController(dependencies, onSelectTreino)
    );

    await flush();

    await act(async () => {
      await result.current.onDelete('t1');
    });

    expect(dependencies.deleteTreino.execute).toHaveBeenCalledWith('t1');
    expect(dependencies.listTreinos.execute).toHaveBeenCalledTimes(2);
  });

  it('onDuplicate calls duplicarTreino and reloads', async () => {
    const dependencies = createMockDependencies();
    const onSelectTreino = vi.fn();

    const { result } = await renderHook(() =>
      useTreinoListController(dependencies, onSelectTreino)
    );

    await flush();

    await act(async () => {
      await result.current.onDuplicate('t1');
    });

    expect(dependencies.duplicarTreino.execute).toHaveBeenCalledWith('t1');
    expect(dependencies.listTreinos.execute).toHaveBeenCalledTimes(2);
    expect(onSelectTreino).toHaveBeenCalledWith(treinoA);
  });

  it('onDelete sets deletingId during async op', async () => {
    let resolveDelete: () => void = () => {};
    const deletePromise = new Promise<void>((resolve) => {
      resolveDelete = resolve;
    });
    const mockDeleteTreino = {
      execute: vi.fn().mockReturnValue(deletePromise),
    } as never;
    const dependencies = createMockDependencies({
      deleteTreino: mockDeleteTreino,
    });
    const onSelectTreino = vi.fn();

    const { result } = await renderHook(() =>
      useTreinoListController(dependencies, onSelectTreino)
    );

    await flush();

    await act(async () => {
      result.current.onDelete('t1');
    });

    expect(result.current.deletingId).toBe('t1');

    // Clean up by resolving the promise
    await act(async () => {
      resolveDelete();
      await Promise.resolve();
    });
  });
});
