import { describe, expect, it, vi } from 'vitest';

import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';
import { InMemoryTreinoExercicioRepository } from '../../../infrastructure/treinos/InMemoryTreinoExercicioRepository';
import { InMemorySessaoExercicioRepository } from '../../../infrastructure/sessoes/InMemorySessaoExercicioRepository';
import { InMemorySerieRegistradaRepository } from '../../../infrastructure/sessoes/InMemorySerieRegistradaRepository';
import { ExerciseNotFoundError } from '../errors/ExerciseNotFoundError';
import { CreateExerciseUseCase } from './CreateExerciseUseCase';
import { DeleteExerciseUseCase } from './DeleteExerciseUseCase';

function makeRepo() {
  return new InMemoryExerciseRepository();
}

function makeCreateUseCase(repo: InMemoryExerciseRepository) {
  return new CreateExerciseUseCase({
    exerciseRepository: repo,
    idGenerator: () => 'exercise_1',
    now: () => new Date('2026-04-24T12:00:00.000Z'),
  });
}

function makeDeleteUseCase(repo: InMemoryExerciseRepository, mediaFileCleanup?: any) {
  return new DeleteExerciseUseCase({
    exerciseRepository: repo,
    treinoExercicioRepository: new InMemoryTreinoExercicioRepository(),
    sessaoExercicioRepository: new InMemorySessaoExercicioRepository(),
    serieRegistradaRepository: new InMemorySerieRegistradaRepository(),
    mediaFileCleanup,
  });
}

describe('DeleteExerciseUseCase', () => {
  it('deletes an existing exercise', async () => {
    const repo = makeRepo();
    const create = makeCreateUseCase(repo);
    const del = makeDeleteUseCase(repo);

    await create.execute({ name: 'Supino reto', groupMuscles: ['Peito'], category: 'Composto' });

    await del.execute('exercise_1');

    const remaining = await repo.list();
    expect(remaining).toHaveLength(0);
  });

  it('throws ExerciseNotFoundError when exercise does not exist', async () => {
    const repo = makeRepo();
    const del = makeDeleteUseCase(repo);

    await expect(del.execute('non_existent')).rejects.toThrow(ExerciseNotFoundError);
  });

  it('deletes the local media file when exercise has mediaLocal starting with file://', async () => {
    const repo = makeRepo();
    const create = makeCreateUseCase(repo);
    const mockMediaFileCleanup = {
      deleteFileIfExists: vi.fn().mockResolvedValue(undefined),
    };
    const del = makeDeleteUseCase(repo, mockMediaFileCleanup);

    await create.execute({
      name: 'Supino reto com arquivo local',
      groupMuscles: ['Peito'],
      category: 'Composto',
      mediaLocal: 'file:///data/exercises/ex1_local.mp4',
    });

    await del.execute('exercise_1');

    expect(mockMediaFileCleanup.deleteFileIfExists).toHaveBeenCalledWith('file:///data/exercises/ex1_local.mp4');
    expect(mockMediaFileCleanup.deleteFileIfExists).toHaveBeenCalledOnce();

    const remaining = await repo.list();
    expect(remaining).toHaveLength(0);
  });
});
