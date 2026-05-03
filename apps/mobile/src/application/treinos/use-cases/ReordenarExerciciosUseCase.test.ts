import { describe, expect, it } from 'vitest';

import { Exercise } from '../../../domain/exercises/entities/Exercise';
import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';
import { InMemoryTreinoExercicioRepository } from '../../../infrastructure/treinos/InMemoryTreinoExercicioRepository';
import { InMemoryTreinoRepository } from '../../../infrastructure/treinos/InMemoryTreinoRepository';
import { AddExercicioAoTreinoUseCase } from './AddExercicioAoTreinoUseCase';
import { CreateTreinoUseCase } from './CreateTreinoUseCase';
import { ReordenarExerciciosUseCase } from './ReordenarExerciciosUseCase';

describe('ReordenarExerciciosUseCase', () => {
  it('reorders exercises in a treino', async () => {
    const treinoRepository = new InMemoryTreinoRepository();
    const treinoExercicioRepository = new InMemoryTreinoExercicioRepository();
    const exerciseRepository = new InMemoryExerciseRepository();

    await new CreateTreinoUseCase({
      treinoRepository,
      idGenerator: () => 'treino_1',
      now: () => new Date(),
    }).execute({ name: 'Treino A' });

    for (const id of ['ex_1', 'ex_2', 'ex_3']) {
      await exerciseRepository.save(
        Exercise.create({ id, name: `Exercicio ${id}`, groupMuscle: 'Peito', category: 'Composto', createdAt: new Date() })
      );
    }

    let counter = 0;
    const add = new AddExercicioAoTreinoUseCase({
      treinoRepository,
      treinoExercicioRepository,
      exerciseRepository,
      idGenerator: () => `te_${++counter}`,
    });

    await add.execute({ treinoId: 'treino_1', exercicioId: 'ex_1' });
    await add.execute({ treinoId: 'treino_1', exercicioId: 'ex_2' });
    await add.execute({ treinoId: 'treino_1', exercicioId: 'ex_3' });

    const reorder = new ReordenarExerciciosUseCase({ treinoRepository, treinoExercicioRepository });

    await reorder.execute({ treinoId: 'treino_1', treinoExercicioIds: ['te_3', 'te_1', 'te_2'] });

    const ordered = await treinoExercicioRepository.listByTreinoId('treino_1');

    expect(ordered[0].toPrimitives().id).toBe('te_3');
    expect(ordered[1].toPrimitives().id).toBe('te_1');
    expect(ordered[2].toPrimitives().id).toBe('te_2');
  });
});
