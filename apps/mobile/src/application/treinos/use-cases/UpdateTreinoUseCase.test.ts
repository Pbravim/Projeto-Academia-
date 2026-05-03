import { describe, expect, it } from 'vitest';

import { Treino } from '../../../domain/treinos/entities/Treino';
import { TreinoValidationError } from '../../../domain/treinos/errors/TreinoValidationError';
import { InMemoryTreinoRepository } from '../../../infrastructure/treinos/InMemoryTreinoRepository';
import { TreinoNotFoundError } from '../errors/TreinoNotFoundError';
import { UpdateTreinoUseCase } from './UpdateTreinoUseCase';

const baseDate = new Date('2026-05-03T10:00:00.000Z');
const updatedDate = new Date('2026-05-03T11:00:00.000Z');

function makeDeps() {
  const repository = new InMemoryTreinoRepository();
  const useCase = new UpdateTreinoUseCase({ treinoRepository: repository, now: () => updatedDate });
  return { repository, useCase };
}

async function seedTreino(repository: InMemoryTreinoRepository) {
  const treino = Treino.create({ id: 'treino_1', name: 'Treino A', objetivo: 'Forca', createdAt: baseDate });
  await repository.save(treino);
  return treino;
}

describe('UpdateTreinoUseCase', () => {
  it('atualiza o nome do treino', async () => {
    const { repository, useCase } = makeDeps();
    await seedTreino(repository);

    const result = await useCase.execute({ id: 'treino_1', name: 'Treino B' });

    expect(result.name).toBe('Treino B');
    expect(result.id).toBe('treino_1');
    expect(result.updatedAt).toBe(updatedDate.toISOString());
  });

  it('atualiza o objetivo', async () => {
    const { repository, useCase } = makeDeps();
    await seedTreino(repository);

    const result = await useCase.execute({ id: 'treino_1', name: 'Treino A', objetivo: 'Hipertrofia' });

    expect(result.objetivo).toBe('Hipertrofia');
  });

  it('permite remover o objetivo passando null', async () => {
    const { repository, useCase } = makeDeps();
    await seedTreino(repository);

    const result = await useCase.execute({ id: 'treino_1', name: 'Treino A', objetivo: null });

    expect(result.objetivo).toBeNull();
  });

  it('preserva o createdAt original', async () => {
    const { repository, useCase } = makeDeps();
    await seedTreino(repository);

    const result = await useCase.execute({ id: 'treino_1', name: 'Treino B' });

    expect(result.createdAt).toBe(baseDate.toISOString());
  });

  it('persiste a atualizacao no repositorio', async () => {
    const { repository, useCase } = makeDeps();
    await seedTreino(repository);

    await useCase.execute({ id: 'treino_1', name: 'Treino Novo' });

    const saved = await repository.findById('treino_1');
    expect(saved?.toPrimitives().name).toBe('Treino Novo');
  });

  it('lanca TreinoNotFoundError quando treino nao existe', async () => {
    const { useCase } = makeDeps();
    await expect(useCase.execute({ id: 'nao_existe', name: 'X' })).rejects.toThrow(TreinoNotFoundError);
  });

  it('lanca TreinoValidationError para nome vazio', async () => {
    const { repository, useCase } = makeDeps();
    await seedTreino(repository);
    await expect(useCase.execute({ id: 'treino_1', name: '   ' })).rejects.toThrow(TreinoValidationError);
  });
});
