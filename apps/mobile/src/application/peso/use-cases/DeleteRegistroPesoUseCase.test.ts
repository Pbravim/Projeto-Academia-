import { describe, expect, it } from 'vitest';

import { InMemoryRegistroPesoRepository } from '../../../infrastructure/peso/InMemoryRegistroPesoRepository';
import { RegistroPeso } from '../../../domain/peso/entities/RegistroPeso';
import { DeleteRegistroPesoUseCase } from './DeleteRegistroPesoUseCase';

function makeDeps() {
  const repository = new InMemoryRegistroPesoRepository();
  const useCase = new DeleteRegistroPesoUseCase(repository);
  return { repository, useCase };
}

describe('DeleteRegistroPesoUseCase', () => {
  it('remove o registro existente', async () => {
    const { repository, useCase } = makeDeps();
    const registro = RegistroPeso.restore({
      id: 'peso_1',
      pesoKg: 80,
      dataRegistro: '2026-05-03T10:00:00.000Z',
      observacao: null,
    });
    await repository.save(registro);

    await useCase.execute('peso_1');

    const found = await repository.findById('peso_1');
    expect(found).toBeNull();
  });

  it('nao lanca erro ao excluir id inexistente', async () => {
    const { useCase } = makeDeps();
    await expect(useCase.execute('nao_existe')).resolves.toBeUndefined();
  });
});
