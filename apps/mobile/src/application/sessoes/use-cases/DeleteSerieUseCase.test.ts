import { describe, expect, it } from 'vitest';

import { SerieRegistrada } from '../../../domain/sessoes/entities/SerieRegistrada';
import { InMemorySerieRegistradaRepository } from '../../../infrastructure/sessoes/InMemorySerieRegistradaRepository';
import { SerieNotFoundError } from '../errors/SerieNotFoundError';
import { DeleteSerieUseCase } from './DeleteSerieUseCase';

describe('DeleteSerieUseCase', () => {
  it('deletes an existing serie', async () => {
    const repo = new InMemorySerieRegistradaRepository();
    await repo.save(
      SerieRegistrada.create({
        id: 'serie_1',
        sessaoExercicioId: 'se_1',
        ordem: 1,
        cargaKg: 50,
        repeticoes: 10,
      })
    );

    const useCase = new DeleteSerieUseCase({ serieRegistradaRepository: repo });
    await useCase.execute('serie_1');

    expect(await repo.findById('serie_1')).toBeNull();
  });

  it('throws SerieNotFoundError when serie does not exist', async () => {
    const repo = new InMemorySerieRegistradaRepository();
    const useCase = new DeleteSerieUseCase({ serieRegistradaRepository: repo });

    await expect(useCase.execute('non_existent')).rejects.toThrow(SerieNotFoundError);
  });
});
