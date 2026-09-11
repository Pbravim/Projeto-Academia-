import { describe, expect, it } from 'vitest';

import { PesoValidationError } from '../../../domain/peso/errors/PesoValidationError';
import { InMemoryRegistroPesoRepository } from '../../../infrastructure/peso/InMemoryRegistroPesoRepository';

import { RegistrarPesoUseCase } from './RegistrarPesoUseCase';

const fixedDate = new Date('2026-05-03T10:00:00.000Z');

function makeDeps() {
  const repository = new InMemoryRegistroPesoRepository();
  const useCase = new RegistrarPesoUseCase({
    registroPesoRepository: repository,
    idGenerator: () => 'peso_1',
    now: () => fixedDate,
  });
  return { repository, useCase };
}

describe('RegistrarPesoUseCase', () => {
  it('persiste um registro de peso valido', async () => {
    const { repository, useCase } = makeDeps();

    const result = await useCase.execute({ pesoKg: 80.5 });

    expect(result).toEqual({
      id: 'peso_1',
      pesoKg: 80.5,
      dataRegistro: '2026-05-03T10:00:00.000Z',
      observacao: null,
    });

    const saved = await repository.findById('peso_1');
    expect(saved).not.toBeNull();
  });

  it('persiste com observacao', async () => {
    const { useCase } = makeDeps();
    const result = await useCase.execute({ pesoKg: 80, observacao: 'Em jejum' });
    expect(result.observacao).toBe('Em jejum');
  });

  it('propaga PesoValidationError para peso invalido', async () => {
    const { useCase } = makeDeps();
    await expect(useCase.execute({ pesoKg: 0 })).rejects.toThrow(PesoValidationError);
    await expect(useCase.execute({ pesoKg: -1 })).rejects.toThrow(PesoValidationError);
  });
});
