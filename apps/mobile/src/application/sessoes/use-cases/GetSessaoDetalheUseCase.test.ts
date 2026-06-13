import { describe, expect, it } from 'vitest';
import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { InMemorySessaoExercicioRepository } from '../../../infrastructure/sessoes/InMemorySessaoExercicioRepository';
import { InMemorySerieRegistradaRepository } from '../../../infrastructure/sessoes/InMemorySerieRegistradaRepository';
import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { SessaoExercicio } from '../../../domain/sessoes/entities/SessaoExercicio';
import { SerieRegistrada } from '../../../domain/sessoes/entities/SerieRegistrada';
import { Exercise } from '../../../domain/exercises/entities/Exercise';
import { GetSessaoDetalheUseCase } from './GetSessaoDetalheUseCase';

function makeSessao(id = 's1') {
  return SessaoTreino.create({
    id,
    treinoId: 't1',
    treinoNomeSnapshot: 'Treino A',
    dataHoraInicio: new Date('2026-01-01T10:00:00Z'),
  });
}

function makeSE(id: string, sessaoId: string, exercicioId = 'ex1') {
  return SessaoExercicio.create({
    id,
    sessaoTreinoId: sessaoId,
    exercicioId,
    ordem: 0,
    nomeSnapshot: 'Supino',
    grupoMuscularSnapshot: 'Peito',
    categoriaSnapshot: 'Musculação',
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
}

function makeSerie(id: string, seId: string) {
  return SerieRegistrada.create({
    id,
    sessaoExercicioId: seId,
    ordem: 0,
    cargaKg: 50,
    repeticoes: 10,
  });
}

function makeExercise(id: string) {
  return Exercise.create({
    id,
    name: 'Supino',
    groupMuscles: ['Peito'],
    category: 'Musculação',
    createdAt: new Date('2026-01-01'),
    isCustom: false,
  });
}

describe('GetSessaoDetalheUseCase', () => {
  it('throws when session does not exist', async () => {
    const deps = {
      sessaoTreinoRepository: new InMemorySessaoTreinoRepository(),
      sessaoExercicioRepository: new InMemorySessaoExercicioRepository(),
      serieRegistradaRepository: new InMemorySerieRegistradaRepository(),
      exerciseRepository: new InMemoryExerciseRepository(),
    };
    await expect(new GetSessaoDetalheUseCase(deps).execute('nonexistent')).rejects.toThrow();
  });

  it('returns session with exercises and series', async () => {
    const sessaoRepo = new InMemorySessaoTreinoRepository();
    const seRepo = new InMemorySessaoExercicioRepository();
    const serieRepo = new InMemorySerieRegistradaRepository();
    const exRepo = new InMemoryExerciseRepository();

    const sessao = makeSessao('s1');
    const se = makeSE('se1', 's1', 'ex1');
    const serie = makeSerie('sr1', 'se1');
    const exercise = makeExercise('ex1');

    await sessaoRepo.save(sessao);
    await seRepo.save(se);
    await serieRepo.save(serie);
    await exRepo.save(exercise);

    const result = await new GetSessaoDetalheUseCase({
      sessaoTreinoRepository: sessaoRepo,
      sessaoExercicioRepository: seRepo,
      serieRegistradaRepository: serieRepo,
      exerciseRepository: exRepo,
    }).execute('s1');

    expect(result.sessao.id).toBe('s1');
    expect(result.exercicios).toHaveLength(1);
    expect(result.exercicios[0].series).toHaveLength(1);
    expect(result.exercicios[0].series[0].cargaKg).toBe(50);
  });

  it('returns session with no exercises when none added', async () => {
    const sessaoRepo = new InMemorySessaoTreinoRepository();
    await sessaoRepo.save(makeSessao('s1'));

    const result = await new GetSessaoDetalheUseCase({
      sessaoTreinoRepository: sessaoRepo,
      sessaoExercicioRepository: new InMemorySessaoExercicioRepository(),
      serieRegistradaRepository: new InMemorySerieRegistradaRepository(),
      exerciseRepository: new InMemoryExerciseRepository(),
    }).execute('s1');

    expect(result.exercicios).toEqual([]);
  });

  it('returns mediaOnline and mediaLocal from exercise catalog', async () => {
    const sessaoRepo = new InMemorySessaoTreinoRepository();
    const seRepo = new InMemorySessaoExercicioRepository();
    const serieRepo = new InMemorySerieRegistradaRepository();
    const exRepo = new InMemoryExerciseRepository();

    await sessaoRepo.save(makeSessao('s1'));
    await seRepo.save(makeSE('se1', 's1', 'ex1'));

    const exercise = Exercise.create({
      id: 'ex1',
      name: 'Supino',
      groupMuscles: ['Peito'],
      createdAt: new Date('2026-01-01'),
      mediaOnline: 'https://example.com/video.mp4',
      mediaLocal: null,
    });
    await exRepo.save(exercise);

    const result = await new GetSessaoDetalheUseCase({
      sessaoTreinoRepository: sessaoRepo,
      sessaoExercicioRepository: seRepo,
      serieRegistradaRepository: serieRepo,
      exerciseRepository: exRepo,
    }).execute('s1');

    expect(result.exercicios[0].mediaOnline).toBe('https://example.com/video.mp4');
    expect(result.exercicios[0].mediaLocal).toBeNull();
  });

  it('returns null media when exercise is not found in catalog', async () => {
    const sessaoRepo = new InMemorySessaoTreinoRepository();
    const seRepo = new InMemorySessaoExercicioRepository();
    const serieRepo = new InMemorySerieRegistradaRepository();
    const exRepo = new InMemoryExerciseRepository();

    await sessaoRepo.save(makeSessao('s1'));
    // Save a SessaoExercicio referencing an exercise that does NOT exist in the catalog
    await seRepo.save(makeSE('se1', 's1', 'ex-missing'));

    const result = await new GetSessaoDetalheUseCase({
      sessaoTreinoRepository: sessaoRepo,
      sessaoExercicioRepository: seRepo,
      serieRegistradaRepository: serieRepo,
      exerciseRepository: exRepo,
    }).execute('s1');

    expect(result.exercicios[0].mediaOnline).toBeNull();
    expect(result.exercicios[0].mediaLocal).toBeNull();
  });

  it('groups series correctly across multiple exercises', async () => {
    const sessaoRepo = new InMemorySessaoTreinoRepository();
    const seRepo = new InMemorySessaoExercicioRepository();
    const serieRepo = new InMemorySerieRegistradaRepository();
    const exRepo = new InMemoryExerciseRepository();

    await sessaoRepo.save(makeSessao('s1'));
    await seRepo.save(makeSE('se1', 's1', 'ex1'));
    await seRepo.save(makeSE('se2', 's1', 'ex2'));

    await serieRepo.save(SerieRegistrada.create({ id: 'sr1', sessaoExercicioId: 'se1', ordem: 0, cargaKg: 40, repeticoes: 8 }));
    await serieRepo.save(SerieRegistrada.create({ id: 'sr2', sessaoExercicioId: 'se1', ordem: 1, cargaKg: 45, repeticoes: 6 }));
    await serieRepo.save(SerieRegistrada.create({ id: 'sr3', sessaoExercicioId: 'se2', ordem: 0, cargaKg: 60, repeticoes: 12 }));

    const result = await new GetSessaoDetalheUseCase({
      sessaoTreinoRepository: sessaoRepo,
      sessaoExercicioRepository: seRepo,
      serieRegistradaRepository: serieRepo,
      exerciseRepository: exRepo,
    }).execute('s1');

    expect(result.exercicios).toHaveLength(2);

    const se1 = result.exercicios.find((e) => e.sessaoExercicio.id === 'se1');
    const se2 = result.exercicios.find((e) => e.sessaoExercicio.id === 'se2');

    expect(se1?.series).toHaveLength(2);
    expect(se2?.series).toHaveLength(1);
    expect(se1?.series[0].cargaKg).toBe(40);
    expect(se2?.series[0].cargaKg).toBe(60);
  });
});
