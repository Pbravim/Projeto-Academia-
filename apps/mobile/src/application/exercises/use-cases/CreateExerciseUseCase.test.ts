import { describe, expect, it } from 'vitest';

import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';
import { DuplicateExerciseError } from '../errors/DuplicateExerciseError';
import { CreateExerciseUseCase } from './CreateExerciseUseCase';

describe('CreateExerciseUseCase', () => {
  it('creates and persists a new exercise', async () => {
    const exerciseRepository = new InMemoryExerciseRepository();
    const useCase = new CreateExerciseUseCase({
      exerciseRepository,
      idGenerator: () => 'exercise_1',
      now: () => new Date('2026-04-24T12:00:00.000Z'),
    });

    const createdExercise = await useCase.execute({
      name: 'Supino reto',
      groupMuscle: 'Peito',
      category: 'Composto',
      equipment: 'Barra olimpica',
    });

    const persistedExercises = await exerciseRepository.list();

    expect(createdExercise.id).toBe('exercise_1');
    expect(persistedExercises).toHaveLength(1);
    expect(persistedExercises[0].toPrimitives().normalizedName).toBe('supino reto');
  });

  it('rejects duplicate names after normalization', async () => {
    const exerciseRepository = new InMemoryExerciseRepository();
    const useCase = new CreateExerciseUseCase({
      exerciseRepository,
      idGenerator: () => 'exercise_1',
      now: () => new Date('2026-04-24T12:00:00.000Z'),
    });

    await useCase.execute({
      name: 'Supino reto',
      groupMuscle: 'Peito',
      category: 'Composto',
      equipment: 'Barra olimpica',
    });

    await expect(
      useCase.execute({
        name: '  supino   reto ',
        groupMuscle: 'Peito',
        category: 'Composto',
      })
    ).rejects.toThrow(DuplicateExerciseError);
  });
});
