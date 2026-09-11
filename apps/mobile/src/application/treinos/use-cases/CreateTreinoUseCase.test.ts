import { describe, expect, it } from 'vitest';

import { TreinoValidationError } from '../../../domain/treinos/errors/TreinoValidationError';
import { InMemoryTreinoRepository } from '../../../infrastructure/treinos/InMemoryTreinoRepository';

import { CreateTreinoUseCase } from './CreateTreinoUseCase';

function makeUseCase(repo = new InMemoryTreinoRepository()) {
  return new CreateTreinoUseCase({
    treinoRepository: repo,
    idGenerator: () => 'treino_1',
    now: () => new Date('2026-04-24T12:00:00.000Z'),
  });
}

describe('CreateTreinoUseCase', () => {
  it('creates and persists a treino', async () => {
    const repo = new InMemoryTreinoRepository();
    const useCase = makeUseCase(repo);

    const created = await useCase.execute({ name: 'Treino A', objetivo: 'Hipertrofia' });

    expect(created.id).toBe('treino_1');
    expect(created.name).toBe('Treino A');
    expect(created.objetivo).toBe('Hipertrofia');

    const persisted = await repo.list();
    expect(persisted).toHaveLength(1);
  });

  it('creates treino without objetivo', async () => {
    const useCase = makeUseCase();

    const created = await useCase.execute({ name: 'Treino B' });

    expect(created.objetivo).toBeNull();
  });

  it('rejects empty name', async () => {
    const useCase = makeUseCase();

    await expect(useCase.execute({ name: '   ' })).rejects.toThrow(TreinoValidationError);
  });
});
