import { beforeEach,describe, expect, it } from 'vitest';

import { Treino } from '../../../domain/treinos/entities/Treino';
import { TreinoExercicio } from '../../../domain/treinos/entities/TreinoExercicio';
import type { SQLiteDatabaseClient } from '../../../infrastructure/persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteTreinoExercicioRepository } from '../../../infrastructure/treinos/SQLiteTreinoExercicioRepository';
import { SQLiteTreinoRepository } from '../../../infrastructure/treinos/SQLiteTreinoRepository';
import { createTestDatabase } from '../../../test/db-setup';

import { ReordenacaoIncompletaError,ReordenarExerciciosUseCase } from './ReordenarExerciciosUseCase';

describe('ReordenarExerciciosUseCase - P1 Regression Tests', () => {
  let database: SQLiteDatabaseClient;
  let treinoRepository: SQLiteTreinoRepository;
  let treinoExercicioRepository: SQLiteTreinoExercicioRepository;
  let useCase: ReordenarExerciciosUseCase;

  beforeEach(async () => {
    database = createTestDatabase();
    // linhas-pais exigidas pela FK real treino_exercicios.exercicio_id
    await database.run(
      `INSERT INTO exercises (id, name, normalized_name, group_muscle, category, equipment, load_unit, is_custom, created_at, updated_at) VALUES
       ('ex_1', 'Exercicio Teste 1', 'exercicio teste 1', 'Peito', 'Composto', NULL, 'kg', 0, '2026-07-01T10:00:00.000Z', '2026-07-01T10:00:00.000Z'),
       ('ex_2', 'Exercicio Teste 2', 'exercicio teste 2', 'Peito', 'Composto', NULL, 'kg', 0, '2026-07-01T10:00:00.000Z', '2026-07-01T10:00:00.000Z'),
       ('ex_3', 'Exercicio Teste 3', 'exercicio teste 3', 'Peito', 'Composto', NULL, 'kg', 0, '2026-07-01T10:00:00.000Z', '2026-07-01T10:00:00.000Z')`
    );
    treinoRepository = new SQLiteTreinoRepository(database);
    treinoExercicioRepository = new SQLiteTreinoExercicioRepository(database);

    useCase = new ReordenarExerciciosUseCase({
      treinoRepository,
      treinoExercicioRepository,
    });
  });

  it('P1: throws validation error when passing an incomplete list of exercise IDs', async () => {
    // Arrange: create treino with 3 exercises
    const treino = Treino.create({
      id: 'treino_1',
      name: 'Treino A',
      objetivo: null,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
    });
    await treinoRepository.save(treino);

    const te1 = TreinoExercicio.create({
      id: 'te_1',
      treinoId: 'treino_1',
      exercicioId: 'ex_1',
      ordem: 1,
      seriesRecomendadas: null,
      execucoesRecomendadas: null,
      cargaPadrao: null,
      tempoDescansoSegundos: null,
      metodo: 'normal' as const,
      grupoId: null,
      duracaoRecomendadaSegundos: null,
      distanciaRecomendadaMetros: null,
      intensidadeRecomendada: null,
    });
    const te2 = TreinoExercicio.create({
      id: 'te_2', treinoId: 'treino_1', exercicioId: 'ex_2', ordem: 2,
      seriesRecomendadas: null, execucoesRecomendadas: null, cargaPadrao: null,
      tempoDescansoSegundos: null, metodo: 'normal' as const, grupoId: null,
      duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null,
    });
    const te3 = TreinoExercicio.create({
      id: 'te_3', treinoId: 'treino_1', exercicioId: 'ex_3', ordem: 3,
      seriesRecomendadas: null, execucoesRecomendadas: null, cargaPadrao: null,
      tempoDescansoSegundos: null, metodo: 'normal' as const, grupoId: null,
      duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null,
    });
    await treinoExercicioRepository.save(te1);
    await treinoExercicioRepository.save(te2);
    await treinoExercicioRepository.save(te3);

    // Act & Assert: only providing 2 IDs should fail
    await expect(
      useCase.execute({
        treinoId: 'treino_1',
        treinoExercicioIds: ['te_1', 'te_2'], // missing te_3
      })
    ).rejects.toThrow(ReordenacaoIncompletaError);
  });

  it('reorders exercises successfully with complete list', async () => {
    // Arrange
    const treino = Treino.create({
      id: 'treino_1',
      name: 'Treino A',
      objetivo: null,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
    });
    await treinoRepository.save(treino);

    const te1 = TreinoExercicio.create({
      id: 'te_1',
      treinoId: 'treino_1',
      exercicioId: 'ex_1',
      ordem: 1,
      seriesRecomendadas: null,
      execucoesRecomendadas: null,
      cargaPadrao: null,
      tempoDescansoSegundos: null,
      metodo: 'normal' as const,
      grupoId: null,
      duracaoRecomendadaSegundos: null,
      distanciaRecomendadaMetros: null,
      intensidadeRecomendada: null,
    });
    const te2 = TreinoExercicio.create({
      id: 'te_2', treinoId: 'treino_1', exercicioId: 'ex_2', ordem: 2,
      seriesRecomendadas: null, execucoesRecomendadas: null, cargaPadrao: null,
      tempoDescansoSegundos: null, metodo: 'normal' as const, grupoId: null,
      duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null,
    });
    const te3 = TreinoExercicio.create({
      id: 'te_3', treinoId: 'treino_1', exercicioId: 'ex_3', ordem: 3,
      seriesRecomendadas: null, execucoesRecomendadas: null, cargaPadrao: null,
      tempoDescansoSegundos: null, metodo: 'normal' as const, grupoId: null,
      duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null,
    });
    await treinoExercicioRepository.save(te1);
    await treinoExercicioRepository.save(te2);
    await treinoExercicioRepository.save(te3);

    // Act: reorder to 3, 1, 2
    await useCase.execute({
      treinoId: 'treino_1',
      treinoExercicioIds: ['te_3', 'te_1', 'te_2'],
    });

    // Assert
    const updated1 = await treinoExercicioRepository.findById('te_3');
    const updated2 = await treinoExercicioRepository.findById('te_1');
    const updated3 = await treinoExercicioRepository.findById('te_2');

    expect(updated1?.toPrimitives().ordem).toBe(1);
    expect(updated2?.toPrimitives().ordem).toBe(2);
    expect(updated3?.toPrimitives().ordem).toBe(3);
  });
});
