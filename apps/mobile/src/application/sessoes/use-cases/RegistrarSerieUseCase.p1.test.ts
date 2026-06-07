import { describe, expect, it, beforeEach } from 'vitest';
import { createTestDatabase } from '../../../test/db-setup';
import type { SQLiteDatabaseClient } from '../../../infrastructure/persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteSessaoTreinoRepository } from '../../../infrastructure/sessoes/SQLiteSessaoTreinoRepository';
import { SQLiteSessaoExercicioRepository } from '../../../infrastructure/sessoes/SQLiteSessaoExercicioRepository';
import { SQLiteSerieRegistradaRepository } from '../../../infrastructure/sessoes/SQLiteSerieRegistradaRepository';
import { SQLiteTreinoExercicioRepository } from '../../../infrastructure/treinos/SQLiteTreinoExercicioRepository';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { SessaoExercicio } from '../../../domain/sessoes/entities/SessaoExercicio';
import { TreinoExercicio } from '../../../domain/treinos/entities/TreinoExercicio';
import { RegistrarSerieUseCase } from './RegistrarSerieUseCase';

describe('RegistrarSerieUseCase - P1 Regression Tests', () => {
  let database: SQLiteDatabaseClient;
  let sessaoRepository: SQLiteSessaoTreinoRepository;
  let sessaoExercicioRepository: SQLiteSessaoExercicioRepository;
  let serieRepository: SQLiteSerieRegistradaRepository;
  let treinoExercicioRepository: SQLiteTreinoExercicioRepository;
  let useCase: RegistrarSerieUseCase;

  beforeEach(() => {
    database = createTestDatabase();
    sessaoRepository = new SQLiteSessaoTreinoRepository(database);
    sessaoExercicioRepository = new SQLiteSessaoExercicioRepository(database);
    serieRepository = new SQLiteSerieRegistradaRepository(database);
    treinoExercicioRepository = new SQLiteTreinoExercicioRepository(database);

    useCase = new RegistrarSerieUseCase({
      sessaoTreinoRepository: sessaoRepository,
      sessaoExercicioRepository: sessaoExercicioRepository,
      serieRegistradaRepository: serieRepository,
      treinoExercicioRepository: treinoExercicioRepository,
      idGenerator: (() => {
        let counter = 0;
        return () => `gen_${counter++}`;
      })(),
      database,
    });
  });

  it('P1: registers a serie and updates carga atomically when threshold is met', async () => {
    // Arrange
    const sessao = SessaoTreino.create({
      id: 'sessao_1',
      treinoId: 'treino_1',
      treinoNomeSnapshot: 'Treino A',
      dataHoraInicio: new Date('2026-05-02T10:00:00.000Z'),
    });
    await sessaoRepository.save(sessao);

    const sessaoExercicio = SessaoExercicio.create({
      id: 'se_1',
      sessaoTreinoId: 'sessao_1',
      exercicioId: 'ex_1',
      ordem: 1,
      nomeSnapshot: 'Supino',
      grupoMuscularSnapshot: 'Peito',
      categoriaSnapshot: 'Composto',
      equipamentoSnapshot: null,
      musculoAlvoSnapshot: [],
      movementPatternSnapshot: null,
      realizado: false,
      seriesRecomendadas: 3,
      execucoesRecomendadas: 10,
      cargaPadrao: 50,
      tempoDescansoSegundos: null,
      metodo: 'normal',
      grupoId: null,
      substituidoPorExercicioId: null,
      substituicaoMotivo: null,
      nomeOriginalSnapshot: null,
    });
    await sessaoExercicioRepository.save(sessaoExercicio);

    const treinoExercicio = TreinoExercicio.create({
      id: 'te_1',
      treinoId: 'treino_1',
      exercicioId: 'ex_1',
      ordem: 1,
      seriesRecomendadas: 3,
      execucoesRecomendadas: 10,
      cargaPadrao: 50,
      tempoDescansoSegundos: null,
      metodo: 'normal',
      grupoId: null,
    });
    await treinoExercicioRepository.save(treinoExercicio);

    // Act: register a serie with weight higher than cargaPadrao and enough reps
    const result = await useCase.execute({
      sessaoExercicioId: 'se_1',
      cargaKg: 60,
      repeticoes: 10,
      tipoSerie: 'valida',
    });

    // Assert: serie was created
    expect(result.id).toBeDefined();
    expect(result.cargaKg).toBe(60);
    expect(result.repeticoes).toBe(10);

    // Verify cargaPadrao was updated in sessaoExercicio
    const updatedSessaoExercicio = await sessaoExercicioRepository.findById('se_1');
    expect(updatedSessaoExercicio?.toPrimitives().cargaPadrao).toBe(60);
  });

  it('registers a serie successfully in an active session', async () => {
    // Arrange
    const sessao = SessaoTreino.create({
      id: 'sessao_1',
      treinoId: 'treino_1',
      treinoNomeSnapshot: 'Treino A',
      dataHoraInicio: new Date('2026-05-02T10:00:00.000Z'),
    });
    await sessaoRepository.save(sessao);

    const sessaoExercicio = SessaoExercicio.create({
      id: 'se_1',
      sessaoTreinoId: 'sessao_1',
      exercicioId: 'ex_1',
      ordem: 1,
      nomeSnapshot: 'Supino',
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
      substituidoPorExercicioId: null,
      substituicaoMotivo: null,
      nomeOriginalSnapshot: null,
    });
    await sessaoExercicioRepository.save(sessaoExercicio);

    // Act
    const result = await useCase.execute({
      sessaoExercicioId: 'se_1',
      cargaKg: 50,
      repeticoes: 10,
      tipoSerie: 'valida',
    });

    // Assert
    expect(result.cargaKg).toBe(50);
    expect(result.repeticoes).toBe(10);
    expect(result.tipoSerie).toBe('valida');

    const saved = await serieRepository.findById(result.id);
    expect(saved).not.toBeNull();
  });
});
