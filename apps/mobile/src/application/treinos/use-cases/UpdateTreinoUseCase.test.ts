import { describe, expect, it } from 'vitest';

import { InMemoryTreinoRepository } from '../../../infrastructure/treinos/InMemoryTreinoRepository';
import { Treino } from '../../../domain/treinos/entities/Treino';
import { TreinoNotFoundError } from '../errors/TreinoNotFoundError';
import { DuplicateTreinoError } from '../errors/DuplicateTreinoError';
import { UpdateTreinoUseCase } from './UpdateTreinoUseCase';

function makeUseCase(repo: InMemoryTreinoRepository) {
  return new UpdateTreinoUseCase({
    treinoRepository: repo,
    now: () => new Date('2026-05-22T10:00:00.000Z'),
  });
}

async function populateRepo(repo: InMemoryTreinoRepository) {
  const t1 = Treino.create({ id: 'treino-1', name: 'Treino A', createdAt: new Date('2026-01-01') });
  const t2 = Treino.create({ id: 'treino-2', name: 'Treino B', createdAt: new Date('2026-01-01') });
  await repo.save(t1);
  await repo.save(t2);
}

describe('UpdateTreinoUseCase', () => {
  it('updates name and objetivo', async () => {
    const repo = new InMemoryTreinoRepository();
    await populateRepo(repo);

    const result = await makeUseCase(repo).execute({ id: 'treino-1', name: 'Treino Renomeado', objetivo: 'Hipertrofia' });

    expect(result.name).toBe('Treino Renomeado');
    expect(result.objetivo).toBe('Hipertrofia');
  });

  it('allows keeping the same name', async () => {
    const repo = new InMemoryTreinoRepository();
    await populateRepo(repo);

    const result = await makeUseCase(repo).execute({ id: 'treino-1', name: 'Treino A' });

    expect(result.name).toBe('Treino A');
  });

  it('throws TreinoNotFoundError when treino does not exist', async () => {
    const repo = new InMemoryTreinoRepository();

    await expect(
      makeUseCase(repo).execute({ id: 'nao-existe', name: 'Qualquer' })
    ).rejects.toThrow(TreinoNotFoundError);
  });

  it('throws DuplicateTreinoError when new name matches another treino', async () => {
    const repo = new InMemoryTreinoRepository();
    await populateRepo(repo);

    await expect(
      makeUseCase(repo).execute({ id: 'treino-1', name: 'treino b' })
    ).rejects.toThrow(DuplicateTreinoError);
  });
});
