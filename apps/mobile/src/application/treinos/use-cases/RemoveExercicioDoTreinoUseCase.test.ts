import { describe, expect, it } from 'vitest';

import { Exercise } from '../../../domain/exercises/entities/Exercise';
import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';
import { InMemoryTreinoExercicioRepository } from '../../../infrastructure/treinos/InMemoryTreinoExercicioRepository';
import { InMemoryTreinoRepository } from '../../../infrastructure/treinos/InMemoryTreinoRepository';
import { TreinoExercicioNotFoundError } from '../errors/TreinoExercicioNotFoundError';

import { AddExercicioAoTreinoUseCase } from './AddExercicioAoTreinoUseCase';
import { CreateTreinoUseCase } from './CreateTreinoUseCase';
import { RemoveExercicioDoTreinoUseCase } from './RemoveExercicioDoTreinoUseCase';

describe('RemoveExercicioDoTreinoUseCase', () => {
  it('removes a treinoExercicio by id', async () => {
    const treinoRepository = new InMemoryTreinoRepository();
    const treinoExercicioRepository = new InMemoryTreinoExercicioRepository();
    const exerciseRepository = new InMemoryExerciseRepository();

    await new CreateTreinoUseCase({
      treinoRepository,
      idGenerator: () => 'treino_1',
      now: () => new Date(),
    }).execute({ name: 'Treino A' });

    await exerciseRepository.save(
      Exercise.create({ id: 'exercise_1', name: 'Supino', groupMuscles: ['Peito'], category: 'Composto', createdAt: new Date() })
    );

    await new AddExercicioAoTreinoUseCase({
      treinoRepository,
      treinoExercicioRepository,
      exerciseRepository,
      idGenerator: () => 'te_1',
    }).execute({ treinoId: 'treino_1', exercicioId: 'exercise_1' });

    const remove = new RemoveExercicioDoTreinoUseCase({ treinoExercicioRepository });
    await remove.execute('te_1');

    const remaining = await treinoExercicioRepository.listByTreinoId('treino_1');
    expect(remaining).toHaveLength(0);
  });

  it('throws TreinoExercicioNotFoundError when item does not exist', async () => {
    const treinoExercicioRepository = new InMemoryTreinoExercicioRepository();
    const remove = new RemoveExercicioDoTreinoUseCase({ treinoExercicioRepository });

    await expect(remove.execute('non_existent')).rejects.toThrow(TreinoExercicioNotFoundError);
  });
});
