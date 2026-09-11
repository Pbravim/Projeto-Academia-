import { describe, expect, it } from 'vitest';

import { Treino } from '../../../domain/treinos/entities/Treino';
import { InMemoryTreinoRepository } from '../../../infrastructure/treinos/InMemoryTreinoRepository';

import { ListTreinosUseCase } from './ListTreinosUseCase';

function makeTreino(id: string, name: string) {
  return Treino.create({ id, name, createdAt: new Date('2026-01-01') });
}

describe('ListTreinosUseCase', () => {
  it('returns empty array when no treinos', async () => {
    const repo = new InMemoryTreinoRepository();
    const result = await new ListTreinosUseCase(repo).execute();
    expect(result).toEqual([]);
  });

  it('returns all treinos', async () => {
    const repo = new InMemoryTreinoRepository();
    await repo.save(makeTreino('t1', 'Treino A'));
    await repo.save(makeTreino('t2', 'Treino B'));
    const result = await new ListTreinosUseCase(repo).execute();
    expect(result).toHaveLength(2);
  });

  it('returns primitives (plain objects)', async () => {
    const repo = new InMemoryTreinoRepository();
    await repo.save(makeTreino('t1', 'Treino A'));
    const result = await new ListTreinosUseCase(repo).execute();
    expect(result[0]).toMatchObject({ id: 't1', name: 'Treino A' });
  });
});
