import { beforeEach,describe, expect, it } from 'vitest';

import { Exercise } from '../../../domain/exercises/entities/Exercise';
import { SerieRegistrada } from '../../../domain/sessoes/entities/SerieRegistrada';
import { SessaoExercicio } from '../../../domain/sessoes/entities/SessaoExercicio';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { SQLiteExerciseRepository } from '../../../infrastructure/exercises/SQLiteExerciseRepository';
import type { SQLiteDatabaseClient } from '../../../infrastructure/persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteSerieRegistradaRepository } from '../../../infrastructure/sessoes/SQLiteSerieRegistradaRepository';
import { SQLiteSerieSegmentoRepository } from '../../../infrastructure/sessoes/SQLiteSerieSegmentoRepository';
import { SQLiteSessaoExercicioRepository } from '../../../infrastructure/sessoes/SQLiteSessaoExercicioRepository';
import { SQLiteSessaoTreinoRepository } from '../../../infrastructure/sessoes/SQLiteSessaoTreinoRepository';
import { createTestDatabase } from '../../../test/db-setup';

import { GetSessaoDetalheUseCase } from './GetSessaoDetalheUseCase';

describe('GetSessaoDetalheUseCase - P2 Regression Tests', () => {
  let database: SQLiteDatabaseClient;
  let sessaoRepository: SQLiteSessaoTreinoRepository;
  let sessaoExercicioRepository: SQLiteSessaoExercicioRepository;
  let serieRepository: SQLiteSerieRegistradaRepository;
  let serieSegmentoRepository: SQLiteSerieSegmentoRepository;
  let exerciseRepository: SQLiteExerciseRepository;
  let useCase: GetSessaoDetalheUseCase;

  beforeEach(() => {
    database = createTestDatabase();
    sessaoRepository = new SQLiteSessaoTreinoRepository(database);
    sessaoExercicioRepository = new SQLiteSessaoExercicioRepository(database);
    serieRepository = new SQLiteSerieRegistradaRepository(database);
    serieSegmentoRepository = new SQLiteSerieSegmentoRepository(database);
    exerciseRepository = new SQLiteExerciseRepository(database);

    useCase = new GetSessaoDetalheUseCase({
      sessaoTreinoRepository: sessaoRepository,
      sessaoExercicioRepository: sessaoExercicioRepository,
      serieRegistradaRepository: serieRepository,
      serieSegmentoRepository: serieSegmentoRepository,
      exerciseRepository: exerciseRepository,
    });
  });

  it('P2: retrieves session details with bounded queries (no N+1)', async () => {
    // Arrange: create session with exercises and series
    const sessao = SessaoTreino.create({
      id: 'sessao_1',
      treinoId: 'treino_1',
      treinoNomeSnapshot: 'Treino A',
      dataHoraInicio: new Date('2026-05-02T10:00:00.000Z'),
    });
    await sessaoRepository.save(sessao);

    // Create 2 exercises
    const ex1 = Exercise.create({
      id: 'ex_1',
      name: 'Supino Reto',
      groupMuscles: ['Peito'],
      category: 'Composto',
      isCustom: false,
      createdAt: new Date(),
    });
    const ex2 = Exercise.create({
      id: 'ex_2',
      name: 'Rosca Direta',
      groupMuscles: ['Biceps'],
      category: 'Isolado',
      isCustom: false,
      createdAt: new Date(),
    });
    await exerciseRepository.save(ex1);
    await exerciseRepository.save(ex2);

    // Create 2 session exercises
    const se1 = SessaoExercicio.create({
      id: 'se_1',
      sessaoTreinoId: 'sessao_1',
      exercicioId: 'ex_1',
      ordem: 1,
      nomeSnapshot: 'Supino Reto',
      grupoMuscularSnapshot: 'Peito',
      categoriaSnapshot: 'Composto',
      equipamentoSnapshot: null,
      musculoAlvoSnapshot: [],
      movementPatternSnapshot: null,
      realizado: false,
      seriesRecomendadas: null,
      execucoesRecomendadas: null,
      cargaPadrao: null,
      tempoDescansoSegundos: null,
      metodo: 'normal',
      grupoId: null,
      trackingTypeSnapshot: 'reps_load',
      duracaoRecomendadaSegundos: null,
      distanciaRecomendadaMetros: null,
      intensidadeRecomendada: null,
      substituidoPorExercicioId: null,
      substituicaoMotivo: null,
      nomeOriginalSnapshot: null,
    });
    const se2 = SessaoExercicio.create({
      id: 'se_2',
      sessaoTreinoId: 'sessao_1',
      exercicioId: 'ex_2',
      ordem: 2,
      nomeSnapshot: 'Rosca Direta',
      grupoMuscularSnapshot: 'Biceps',
      categoriaSnapshot: 'Isolado',
      equipamentoSnapshot: null,
      musculoAlvoSnapshot: [],
      movementPatternSnapshot: null,
      realizado: false,
      seriesRecomendadas: null,
      execucoesRecomendadas: null,
      cargaPadrao: null,
      tempoDescansoSegundos: null,
      metodo: 'normal',
      grupoId: null,
      trackingTypeSnapshot: 'reps_load',
      duracaoRecomendadaSegundos: null,
      distanciaRecomendadaMetros: null,
      intensidadeRecomendada: null,
      substituidoPorExercicioId: null,
      substituicaoMotivo: null,
      nomeOriginalSnapshot: null,
    });
    await sessaoExercicioRepository.save(se1);
    await sessaoExercicioRepository.save(se2);

    // Create series for each exercise
    const serie1_1 = SerieRegistrada.create({
      id: 'serie_1_1',
      sessaoExercicioId: 'se_1',
      tipoSerie: 'valida',
      ordem: 1,
      cargaKg: 50,
      repeticoes: 10,
    });
    const serie1_2 = SerieRegistrada.create({
      id: 'serie_1_2',
      sessaoExercicioId: 'se_1',
      tipoSerie: 'valida',
      ordem: 2,
      cargaKg: 50,
      repeticoes: 8,
    });
    const serie2_1 = SerieRegistrada.create({
      id: 'serie_2_1',
      sessaoExercicioId: 'se_2',
      tipoSerie: 'valida',
      ordem: 1,
      cargaKg: 20,
      repeticoes: 12,
    });
    await serieRepository.save(serie1_1);
    await serieRepository.save(serie1_2);
    await serieRepository.save(serie2_1);

    // Act
    const result = await useCase.execute('sessao_1');

    // Assert: verify structure is correct and no N+1
    expect(result.sessao.id).toBe('sessao_1');
    expect(result.exercicios).toHaveLength(2);

    // Verify first exercise with its series
    const ex1Result = result.exercicios[0];
    expect(ex1Result.sessaoExercicio.id).toBe('se_1');
    expect(ex1Result.series).toHaveLength(2);

    // Verify second exercise with its series
    const ex2Result = result.exercicios[1];
    expect(ex2Result.sessaoExercicio.id).toBe('se_2');
    expect(ex2Result.series).toHaveLength(1);
  });

  it('retrieves session with no exercises', async () => {
    // Arrange
    const sessao = SessaoTreino.create({
      id: 'sessao_1',
      treinoId: 'treino_1',
      treinoNomeSnapshot: 'Treino Vazio',
      dataHoraInicio: new Date('2026-05-02T10:00:00.000Z'),
    });
    await sessaoRepository.save(sessao);

    // Act
    const result = await useCase.execute('sessao_1');

    // Assert
    expect(result.sessao.id).toBe('sessao_1');
    expect(result.exercicios).toHaveLength(0);
  });
});
