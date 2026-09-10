import { describe, expect, it } from 'vitest';

import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { Treino } from '../../../domain/treinos/entities/Treino';
import { InMemoryPlanoSemanalRepository } from '../../../infrastructure/plano/InMemoryPlanoSemanalRepository';
import { InMemorySerieRegistradaRepository } from '../../../infrastructure/sessoes/InMemorySerieRegistradaRepository';
import { InMemorySessaoExercicioRepository } from '../../../infrastructure/sessoes/InMemorySessaoExercicioRepository';
import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { InMemoryTreinoExercicioRepository } from '../../../infrastructure/treinos/InMemoryTreinoExercicioRepository';
import { InMemoryTreinoRepository } from '../../../infrastructure/treinos/InMemoryTreinoRepository';
import { TreinoNotFoundError } from '../errors/TreinoNotFoundError';

import { CreateTreinoUseCase } from './CreateTreinoUseCase';
import { DeleteTreinoUseCase } from './DeleteTreinoUseCase';

function makeRepos() {
  return {
    treinoRepository: new InMemoryTreinoRepository(),
    treinoExercicioRepository: new InMemoryTreinoExercicioRepository(),
    sessaoTreinoRepository: new InMemorySessaoTreinoRepository(),
    sessaoExercicioRepository: new InMemorySessaoExercicioRepository(),
    serieRegistradaRepository: new InMemorySerieRegistradaRepository(),
    planoSemanalRepository: new InMemoryPlanoSemanalRepository(),
    database: { withTransaction: <T>(fn: () => Promise<T>) => fn() },
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

  it('deleta sessoes associadas ao treino em cascata', async () => {
    const repos = makeRepos();
    const create = new CreateTreinoUseCase({
      treinoRepository: repos.treinoRepository,
      idGenerator: () => 'treino_1',
      now: () => new Date(),
    });
    const del = new DeleteTreinoUseCase(repos);

    await create.execute({ name: 'Treino A' });

    const sessao = SessaoTreino.create({
      id: 'sessao_1',
      treinoId: 'treino_1',
      treinoNomeSnapshot: 'Treino A',
      dataHoraInicio: new Date('2026-05-21T10:00:00.000Z'),
    });
    await repos.sessaoTreinoRepository.save(sessao);

    await del.execute('treino_1');

    expect(await repos.treinoRepository.list()).toHaveLength(0);
    expect(await repos.sessaoTreinoRepository.findById('sessao_1')).toBeNull();
  });

  it('clears plano semanal entries that reference the deleted treino', async () => {
    const repos = makeRepos();
    const planoRepo = repos.planoSemanalRepository;

    const treino = Treino.create({ id: 'treino-1', name: 'Treino A', createdAt: new Date() });
    await repos.treinoRepository.save(treino);
    await planoRepo.setDia('seg', 'treino-1');
    await planoRepo.setDia('qua', 'treino-1');

    const uc = new DeleteTreinoUseCase(repos);

    await uc.execute('treino-1');

    const plano = await planoRepo.getPlano();
    expect(plano.seg).toBeNull();
    expect(plano.qua).toBeNull();
  });
});
