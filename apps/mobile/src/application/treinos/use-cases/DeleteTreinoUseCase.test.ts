import { describe, expect, it } from 'vitest';

import { InMemoryTreinoExercicioRepository } from '../../../infrastructure/treinos/InMemoryTreinoExercicioRepository';
import { InMemoryTreinoRepository } from '../../../infrastructure/treinos/InMemoryTreinoRepository';
import { TreinoNotFoundError } from '../errors/TreinoNotFoundError';
import { CreateTreinoUseCase } from './CreateTreinoUseCase';
import { DeleteTreinoUseCase } from './DeleteTreinoUseCase';

function makeRepos() {
  return {
    treinoRepository: new InMemoryTreinoRepository(),
    treinoExercicioRepository: new InMemoryTreinoExercicioRepository(),
  };
}

describe('DeleteTreinoUseCase', () => {
  it('deletes an existing treino', async () => {
    const repos = makeRepos();
    const create = new CreateTreinoUseCase({
      treinoRepository: repos.treinoRepository,
      idGenerator: () => 'treino_1',
      now: () => new Date(),
    });
    const del = new DeleteTreinoUseCase(repos);

    await create.execute({ name: 'Treino A' });
    await del.execute('treino_1');

    const remaining = await repos.treinoRepository.list();
    expect(remaining).toHaveLength(0);
  });

  it('throws TreinoNotFoundError when treino does not exist', async () => {
    const repos = makeRepos();
    const del = new DeleteTreinoUseCase(repos);

    await expect(del.execute('non_existent')).rejects.toThrow(TreinoNotFoundError);
  });
});
