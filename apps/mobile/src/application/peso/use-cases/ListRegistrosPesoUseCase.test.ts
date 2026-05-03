import { describe, expect, it } from 'vitest';

import { InMemoryRegistroPesoRepository } from '../../../infrastructure/peso/InMemoryRegistroPesoRepository';
import { RegistroPeso } from '../../../domain/peso/entities/RegistroPeso';
import { ListRegistrosPesoUseCase } from './ListRegistrosPesoUseCase';

function makeDeps() {
  const repository = new InMemoryRegistroPesoRepository();
  const useCase = new ListRegistrosPesoUseCase(repository);
  return { repository, useCase };
}

function makeRegistro(id: string, pesoKg: number, dataRegistro: string) {
  return RegistroPeso.restore({ id, pesoKg, dataRegistro, observacao: null });
}

describe('ListRegistrosPesoUseCase', () => {
  it('retorna lista vazia quando nao ha registros', async () => {
    const { useCase } = makeDeps();
    const result = await useCase.execute();
    expect(result).toHaveLength(0);
  });

  it('retorna registros em ordem decrescente por data', async () => {
    const { repository, useCase } = makeDeps();
    await repository.save(makeRegistro('peso_1', 80, '2026-04-01T10:00:00.000Z'));
    await repository.save(makeRegistro('peso_2', 79.5, '2026-04-08T10:00:00.000Z'));
    await repository.save(makeRegistro('peso_3', 79, '2026-04-15T10:00:00.000Z'));

    const result = await useCase.execute();
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('peso_3');
    expect(result[1].id).toBe('peso_2');
    expect(result[2].id).toBe('peso_1');
  });
});
