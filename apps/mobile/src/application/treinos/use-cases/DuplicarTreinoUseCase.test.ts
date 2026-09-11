import { describe, expect, it } from 'vitest';

import { Treino } from '../../../domain/treinos/entities/Treino';
import { TreinoExercicio } from '../../../domain/treinos/entities/TreinoExercicio';
import { InMemoryTreinoExercicioRepository } from '../../../infrastructure/treinos/InMemoryTreinoExercicioRepository';
import { InMemoryTreinoRepository } from '../../../infrastructure/treinos/InMemoryTreinoRepository';
import { TreinoNotFoundError } from '../errors/TreinoNotFoundError';

import { DuplicarTreinoUseCase } from './DuplicarTreinoUseCase';

describe('DuplicarTreinoUseCase', () => {
  it('generates a unique name when "Copia de X" already exists', async () => {
    const treinoRepo = new InMemoryTreinoRepository();
    const teRepo = new InMemoryTreinoExercicioRepository();

    const original = Treino.create({ id: 'treino-1', name: 'Pernas', createdAt: new Date('2026-01-01') });
    const copiaExistente = Treino.create({ id: 'treino-2', name: 'Copia de Pernas', createdAt: new Date('2026-01-01') });
    await treinoRepo.save(original);
    await treinoRepo.save(copiaExistente);

    const uc = new DuplicarTreinoUseCase({
      treinoRepository: treinoRepo,
      treinoExercicioRepository: teRepo,
      idGenerator: () => 'treino-3',
      now: () => new Date('2026-05-22'),
    });

    const result = await uc.execute('treino-1');

    expect(result.name).toBe('Copia de Pernas (2)');
  });

  it('increments counter further when multiple copies already exist', async () => {
    const treinoRepo = new InMemoryTreinoRepository();
    const teRepo = new InMemoryTreinoExercicioRepository();

    let idCounter = 10;
    const original = Treino.create({ id: 'treino-1', name: 'Pernas', createdAt: new Date('2026-01-01') });
    const copia1 = Treino.create({ id: 'treino-2', name: 'Copia de Pernas', createdAt: new Date('2026-01-01') });
    const copia2 = Treino.create({ id: 'treino-3', name: 'Copia de Pernas (2)', createdAt: new Date('2026-01-01') });
    await treinoRepo.save(original);
    await treinoRepo.save(copia1);
    await treinoRepo.save(copia2);

    const uc = new DuplicarTreinoUseCase({
      treinoRepository: treinoRepo,
      treinoExercicioRepository: teRepo,
      idGenerator: () => `treino-${idCounter++}`,
      now: () => new Date('2026-05-22'),
    });

    const result = await uc.execute('treino-1');

    expect(result.name).toBe('Copia de Pernas (3)');
  });
});
