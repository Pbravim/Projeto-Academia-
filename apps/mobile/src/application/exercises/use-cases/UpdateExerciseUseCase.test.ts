import { describe, expect, it } from 'vitest';

import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';
import { DuplicateExerciseError } from '../errors/DuplicateExerciseError';
import { ExerciseNotFoundError } from '../errors/ExerciseNotFoundError';
import { CreateExerciseUseCase } from './CreateExerciseUseCase';
import { UpdateExerciseUseCase } from './UpdateExerciseUseCase';

function makeRepo() {
  return new InMemoryExerciseRepository();
}

function makeCreateUseCase(repo: InMemoryExerciseRepository, id = 'exercise_1') {
  return new CreateExerciseUseCase({
    exerciseRepository: repo,
    idGenerator: () => id,
    now: () => new Date('2026-04-24T12:00:00.000Z'),
  });
}

function makeUpdateUseCase(repo: InMemoryExerciseRepository) {
  return new UpdateExerciseUseCase({
    exerciseRepository: repo,
    now: () => new Date('2026-04-25T10:00:00.000Z'),
  });
}

describe('UpdateExerciseUseCase', () => {
  it('updates an existing exercise', async () => {
    const repo = makeRepo();
    const create = makeCreateUseCase(repo);
    const update = makeUpdateUseCase(repo);

    await create.execute({ name: 'Supino reto', groupMuscle: 'Peito', category: 'Composto' });

    const updated = await update.execute({
      id: 'exercise_1',
      name: 'Supino inclinado',
      groupMuscle: 'Peito',
      category: 'Composto',
      equipment: 'Halter',
    });

    expect(updated.name).toBe('Supino inclinado');
    expect(updated.normalizedName).toBe('supino inclinado');
    expect(updated.equipment).toBe('Halter');
    expect(updated.updatedAt).toBe('2026-04-25T10:00:00.000Z');
  });

  it('allows updating without changing the name', async () => {
    const repo = makeRepo();
    const create = makeCreateUseCase(repo);
    const update = makeUpdateUseCase(repo);

    await create.execute({ name: 'Supino reto', groupMuscle: 'Peito', category: 'Composto' });

    const updated = await update.execute({
      id: 'exercise_1',
      name: 'Supino reto',
      groupMuscle: 'Peito',
      category: 'Isolado',
    });

    expect(updated.category).toBe('Isolado');
  });

  it('rejects update if new name conflicts with another exercise', async () => {
    const repo = makeRepo();
    const create1 = makeCreateUseCase(repo, 'exercise_1');
    const create2 = makeCreateUseCase(repo, 'exercise_2');
    const update = makeUpdateUseCase(repo);

    await create1.execute({ name: 'Supino reto', groupMuscle: 'Peito', category: 'Composto' });
    await create2.execute({ name: 'Agachamento', groupMuscle: 'Pernas', category: 'Composto' });

    await expect(
      update.execute({
        id: 'exercise_1',
        name: 'agachamento',
        groupMuscle: 'Peito',
        category: 'Composto',
      })
    ).rejects.toThrow(DuplicateExerciseError);
  });

  it('throws ExerciseNotFoundError when exercise does not exist', async () => {
    const repo = makeRepo();
    const update = makeUpdateUseCase(repo);

    await expect(
      update.execute({
        id: 'non_existent',
        name: 'Qualquer',
        groupMuscle: 'Peito',
        category: 'Composto',
      })
    ).rejects.toThrow(ExerciseNotFoundError);
  });

  it('updates musculoAlvo on a custom exercise', async () => {
    const repo = makeRepo();
    const create = makeCreateUseCase(repo);
    const update = makeUpdateUseCase(repo);

    await create.execute({ name: 'Exercicio Customizado', groupMuscle: 'Peito', category: 'Composto' });

    const updated = await update.execute({
      id: 'exercise_1',
      name: 'Exercicio Customizado',
      groupMuscle: 'Peito',
      category: 'Composto',
      musculoAlvo: 'peitoral_medio',
    });

    expect(updated.musculoAlvo).toBe('peitoral_medio');
  });

  it('clears musculoAlvo when null is passed', async () => {
    const repo = makeRepo();
    const create = makeCreateUseCase(repo);
    const update = makeUpdateUseCase(repo);

    await create.execute({
      name: 'Exercicio Customizado',
      groupMuscle: 'Peito',
      category: 'Composto',
      musculoAlvo: 'peitoral_medio',
    });

    const updated = await update.execute({
      id: 'exercise_1',
      name: 'Exercicio Customizado',
      groupMuscle: 'Peito',
      category: 'Composto',
      musculoAlvo: null,
    });

    expect(updated.musculoAlvo).toBeNull();
  });
});
