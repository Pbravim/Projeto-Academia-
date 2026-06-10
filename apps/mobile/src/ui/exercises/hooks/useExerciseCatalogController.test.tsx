import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '../../../test/renderHook';
import { useExerciseCatalogController, type ExerciseCatalogControllerDependencies } from './useExerciseCatalogController';
import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import { ExerciseValidationError } from '../../../domain/exercises/errors/ExerciseValidationError';
import { DuplicateExerciseError } from '../../../application/exercises/errors/DuplicateExerciseError';
import { ExerciseNotFoundError } from '../../../application/exercises/errors/ExerciseNotFoundError';

vi.mock('expo-file-system/legacy', () => ({
  getInfoAsync: vi.fn().mockResolvedValue({ exists: false }),
  moveAsync: vi.fn().mockResolvedValue(undefined),
  documentDirectory: '/tmp/',
}));

const exA: ExercisePrimitives = {
  id: 'e1',
  name: 'Supino',
  normalizedName: 'supino',
  groupMuscles: ['Peito'],
  category: 'Frio',
  equipment: 'Haltere',
  loadUnit: 'kg',
  isCustom: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  mediaOnline: null,
  mediaLocal: null,
  musculoAlvo: ['Peito'],
  movementPattern: null,
  stabilizers: [],
  executionType: null,
  nameVariations: [],
  primaryEquipment: null,
  secondaryEquipment: null,
  catalogVersion: 0,
};

const createMockDependencies = (
  overrides?: Partial<ExerciseCatalogControllerDependencies>
): ExerciseCatalogControllerDependencies => ({
  createExercise: {
    execute: vi.fn().mockResolvedValue(exA),
  } as never,
  updateExercise: {
    execute: vi.fn().mockResolvedValue(exA),
  } as never,
  deleteExercise: {
    execute: vi.fn().mockResolvedValue(undefined),
  } as never,
  listExercises: {
    execute: vi.fn().mockResolvedValue([exA]),
  } as never,
  getUltimasExecucoesValidas: {
    execute: vi.fn().mockResolvedValue(new Map()),
  } as never,
  exerciseRepository: {
    listAlternativas: vi.fn().mockResolvedValue([]),
    addAlternativa: vi.fn().mockResolvedValue(undefined),
    removeAlternativa: vi.fn().mockResolvedValue(undefined),
    updateMedia: vi.fn().mockResolvedValue(undefined),
  } as never,
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

describe('useExerciseCatalogController', () => {
  it('loads exercises on mount', async () => {
    const dependencies = createMockDependencies();
    const onViewHistorico = vi.fn();

    const { result } = await renderHook(() =>
      useExerciseCatalogController(dependencies, onViewHistorico)
    );

    await flush();

    expect(result.current.exercises).toEqual([exA]);
    expect(result.current.isLoading).toBe(false);
    expect(dependencies.listExercises.execute).toHaveBeenCalledTimes(1);
  });

  it('onSubmit with empty name shows error', async () => {
    const mockCreateExercise = {
      execute: vi.fn().mockRejectedValue(new ExerciseValidationError('Nome e obrigatorio.')),
    } as never;
    const dependencies = createMockDependencies({
      createExercise: mockCreateExercise,
    });
    const onViewHistorico = vi.fn();

    const { result } = await renderHook(() =>
      useExerciseCatalogController(dependencies, onViewHistorico)
    );

    await flush();

    await act(async () => {
      result.current.onChangeField('name', '');
    });

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(result.current.errorMessage).toBe('Nome e obrigatorio.');
  });

  it('onSubmit creates exercise and reloads list', async () => {
    const dependencies = createMockDependencies();
    const onViewHistorico = vi.fn();

    const { result } = await renderHook(() =>
      useExerciseCatalogController(dependencies, onViewHistorico)
    );

    await flush();

    await act(async () => {
      result.current.onChangeField('name', 'Agachamento');
    });

    await act(async () => {
      result.current.onChangeField('groupMuscle', 'Perna');
    });

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(dependencies.createExercise.execute).toHaveBeenCalled();
    expect(result.current.exercises).toContain(exA);
  });

  it('DuplicateExerciseError surfaced as user message', async () => {
    const mockCreateExercise = {
      execute: vi.fn().mockRejectedValue(new DuplicateExerciseError('Supino')),
    } as never;
    const dependencies = createMockDependencies({
      createExercise: mockCreateExercise,
    });
    const onViewHistorico = vi.fn();

    const { result } = await renderHook(() =>
      useExerciseCatalogController(dependencies, onViewHistorico)
    );

    await flush();

    await act(async () => {
      result.current.onChangeField('name', 'Supino');
    });

    await act(async () => {
      result.current.onChangeField('groupMuscle', 'Peito');
    });

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(result.current.errorMessage).toContain('Ja existe');
  });

  it('onSelectEdit populates draft and sets editingExerciseId', async () => {
    const dependencies = createMockDependencies();
    const onViewHistorico = vi.fn();

    const { result } = await renderHook(() =>
      useExerciseCatalogController(dependencies, onViewHistorico)
    );

    await flush();

    await act(async () => {
      result.current.onSelectEdit(exA);
    });

    expect(result.current.draft.name).toBe(exA.name);
    expect(result.current.draft.groupMuscle).toBe(exA.groupMuscles.join(', '));
    expect(result.current.editingExerciseId).toBe(exA.id);
  });

  it('onCancelEdit resets draft and editingExerciseId', async () => {
    const dependencies = createMockDependencies();
    const onViewHistorico = vi.fn();

    const { result } = await renderHook(() =>
      useExerciseCatalogController(dependencies, onViewHistorico)
    );

    await flush();

    await act(async () => {
      result.current.onSelectEdit(exA);
    });

    await act(async () => {
      result.current.onCancelEdit();
    });

    expect(result.current.editingExerciseId).toBeNull();
    expect(result.current.draft.name).toBe('');
  });

  it('onDelete calls deleteExercise and removes from list', async () => {
    const dependencies = createMockDependencies();
    const onViewHistorico = vi.fn();

    const { result } = await renderHook(() =>
      useExerciseCatalogController(dependencies, onViewHistorico)
    );

    await flush();

    expect(result.current.exercises).toHaveLength(1);

    await act(async () => {
      await result.current.onDelete('e1');
    });

    expect(dependencies.deleteExercise.execute).toHaveBeenCalledWith('e1');
    expect(result.current.exercises).toHaveLength(0);
  });

  it('ExerciseNotFoundError on delete shows error', async () => {
    const mockDeleteExercise = {
      execute: vi.fn().mockRejectedValue(new ExerciseNotFoundError('e1')),
    } as never;
    const dependencies = createMockDependencies({
      deleteExercise: mockDeleteExercise,
    });
    const onViewHistorico = vi.fn();

    const { result } = await renderHook(() =>
      useExerciseCatalogController(dependencies, onViewHistorico)
    );

    await flush();

    await act(async () => {
      await result.current.onDelete('e1');
    });

    expect(result.current.errorMessage).toBeDefined();
    expect(result.current.errorMessage).toBe('Nao foi possivel excluir o exercicio.');
  });
});
