import { describe, expect, it } from 'vitest';

import { Exercise } from '../../../domain/exercises/entities/Exercise';
import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';
import { InMemoryTreinoExercicioRepository } from '../../../infrastructure/treinos/InMemoryTreinoExercicioRepository';
import { InMemoryTreinoRepository } from '../../../infrastructure/treinos/InMemoryTreinoRepository';
import { ExerciseNotFoundError } from '../../exercises/errors/ExerciseNotFoundError';
import { ExercicioJaNoTreinoError } from '../errors/ExercicioJaNoTreinoError';
import { TreinoNotFoundError } from '../errors/TreinoNotFoundError';
import { CreateTreinoUseCase } from './CreateTreinoUseCase';
import { AddExercicioAoTreinoUseCase } from './AddExercicioAoTreinoUseCase';

function makeRepos() {
  return {
    treinoRepository: new InMemoryTreinoRepository(),
    treinoExercicioRepository: new InMemoryTreinoExercicioRepository(),
    exerciseRepository: new InMemoryExerciseRepository(),
  };
}

async function seedTreino(treinoRepository: InMemoryTreinoRepository, id = 'treino_1') {
  const createTreino = new CreateTreinoUseCase({
    treinoRepository,
    idGenerator: () => id,
    now: () => new Date(),
  });
  await createTreino.execute({ name: 'Treino A' });
}

async function seedExercise(exerciseRepository: InMemoryExerciseRepository, id = 'exercise_1') {
  const exercise = Exercise.create({
    id,
    name: 'Supino reto',
    groupMuscles: ['Peito'],
    category: 'Composto',
    createdAt: new Date(),
  });
  await exerciseRepository.save(exercise);
}

describe('AddExercicioAoTreinoUseCase', () => {
  it('adds an exercise to a treino with correct order', async () => {
    const repos = makeRepos();
    await seedTreino(repos.treinoRepository);
    await seedExercise(repos.exerciseRepository);

    let counter = 0;
    const useCase = new AddExercicioAoTreinoUseCase({
      ...repos,
      idGenerator: () => `te_${++counter}`,
    });

    const result = await useCase.execute({ treinoId: 'treino_1', exercicioId: 'exercise_1' });

    expect(result.ordem).toBe(1);
    expect(result.treinoId).toBe('treino_1');
    expect(result.exercicioId).toBe('exercise_1');
  });

  it('assigns incrementing order for multiple exercises', async () => {
    const repos = makeRepos();
    await seedTreino(repos.treinoRepository);

    const ex2 = Exercise.create({ id: 'exercise_2', name: 'Agachamento', groupMuscles: ['Pernas'], category: 'Composto', createdAt: new Date() });
    await seedExercise(repos.exerciseRepository, 'exercise_1');
    await repos.exerciseRepository.save(ex2);

    let counter = 0;
    const useCase = new AddExercicioAoTreinoUseCase({
      ...repos,
      idGenerator: () => `te_${++counter}`,
    });

    await useCase.execute({ treinoId: 'treino_1', exercicioId: 'exercise_1' });
    const second = await useCase.execute({ treinoId: 'treino_1', exercicioId: 'exercise_2' });

    expect(second.ordem).toBe(2);
  });

  it('throws TreinoNotFoundError when treino does not exist', async () => {
    const repos = makeRepos();
    await seedExercise(repos.exerciseRepository);

    const useCase = new AddExercicioAoTreinoUseCase({ ...repos, idGenerator: () => 'te_1' });

    await expect(
      useCase.execute({ treinoId: 'non_existent', exercicioId: 'exercise_1' })
    ).rejects.toThrow(TreinoNotFoundError);
  });

  it('throws ExerciseNotFoundError when exercise does not exist', async () => {
    const repos = makeRepos();
    await seedTreino(repos.treinoRepository);

    const useCase = new AddExercicioAoTreinoUseCase({ ...repos, idGenerator: () => 'te_1' });

    await expect(
      useCase.execute({ treinoId: 'treino_1', exercicioId: 'non_existent' })
    ).rejects.toThrow(ExerciseNotFoundError);
  });

  it('throws ExercicioJaNoTreinoError when exercise is already in treino', async () => {
    const repos = makeRepos();
    await seedTreino(repos.treinoRepository);
    await seedExercise(repos.exerciseRepository);

    let counter = 0;
    const useCase = new AddExercicioAoTreinoUseCase({
      ...repos,
      idGenerator: () => `te_${++counter}`,
    });

    await useCase.execute({ treinoId: 'treino_1', exercicioId: 'exercise_1' });

    await expect(
      useCase.execute({ treinoId: 'treino_1', exercicioId: 'exercise_1' })
    ).rejects.toThrow(ExercicioJaNoTreinoError);
  });
});
