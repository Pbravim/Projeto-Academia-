import { describe, expect, it } from 'vitest';
import { Exercise } from '../../../domain/exercises/entities/Exercise';
import { SerieRegistrada } from '../../../domain/sessoes/entities/SerieRegistrada';
import { SessaoExercicio } from '../../../domain/sessoes/entities/SessaoExercicio';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';
import { InMemorySerieRegistradaRepository } from '../../../infrastructure/sessoes/InMemorySerieRegistradaRepository';
import { InMemorySessaoExercicioRepository } from '../../../infrastructure/sessoes/InMemorySessaoExercicioRepository';
import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { SubstituirExercicioSessaoUseCase } from './SubstituirExercicioSessaoUseCase';

function makeSessaoAtiva(id = 'sessao-1') {
  return SessaoTreino.create({
    id,
    treinoId: 'treino-1',
    treinoNomeSnapshot: 'Treino A',
    dataHoraInicio: new Date('2026-05-22T09:00:00Z'),
  });
}

function makeSessaoExercicio(id: string, sessaoId: string, exercicioId: string) {
  return SessaoExercicio.create({
    id,
    sessaoTreinoId: sessaoId,
    exercicioId,
    ordem: 1,
    nomeSnapshot: 'Exercício',
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
}

function makeExercise(id: string) {
  return Exercise.create({
    id,
    name: `Exercício ${id}`,
    groupMuscles: ['Peito'],
    category: 'Composto',
    isCustom: false,
    createdAt: new Date('2026-01-01'),
  });
}

describe('SubstituirExercicioSessaoUseCase', () => {
  it('deletes series of the original exercise when substituting', async () => {
    const sessaoRepo = new InMemorySessaoTreinoRepository();
    const sessaoExRepo = new InMemorySessaoExercicioRepository();
    const serieRepo = new InMemorySerieRegistradaRepository();
    const exerciseRepo = new InMemoryExerciseRepository();

    const sessao = makeSessaoAtiva();
    await sessaoRepo.save(sessao);

    const seOriginal = makeSessaoExercicio('se-1', 'sessao-1', 'ex-1');
    await sessaoExRepo.save(seOriginal);

    // Register 2 series for original exercise
    await serieRepo.save(SerieRegistrada.create({ id: 'sr-1', sessaoExercicioId: 'se-1', tipoSerie: 'valida', ordem: 1, cargaKg: 80, repeticoes: 8 }));
    await serieRepo.save(SerieRegistrada.create({ id: 'sr-2', sessaoExercicioId: 'se-1', tipoSerie: 'valida', ordem: 2, cargaKg: 80, repeticoes: 8 }));

    await exerciseRepo.save(makeExercise('ex-1'));
    await exerciseRepo.save(makeExercise('ex-2'));

    const uc = new SubstituirExercicioSessaoUseCase({
      sessaoTreinoRepository: sessaoRepo,
      sessaoExercicioRepository: sessaoExRepo,
      exerciseRepository: exerciseRepo,
      serieRegistradaRepository: serieRepo,
    });

    await uc.execute({ sessaoExercicioId: 'se-1', novoExercicioId: 'ex-2', motivo: null });

    // Series for original exercise must be deleted
    const seriesRestantes = await serieRepo.listBySessaoExercicioId('se-1');
    expect(seriesRestantes).toHaveLength(0);
  });

  it('does not throw when there are no series to delete', async () => {
    const sessaoRepo = new InMemorySessaoTreinoRepository();
    const sessaoExRepo = new InMemorySessaoExercicioRepository();
    const serieRepo = new InMemorySerieRegistradaRepository();
    const exerciseRepo = new InMemoryExerciseRepository();

    const sessao = makeSessaoAtiva();
    await sessaoRepo.save(sessao);
    await sessaoExRepo.save(makeSessaoExercicio('se-1', 'sessao-1', 'ex-1'));
    await exerciseRepo.save(makeExercise('ex-1'));
    await exerciseRepo.save(makeExercise('ex-2'));

    const uc = new SubstituirExercicioSessaoUseCase({
      sessaoTreinoRepository: sessaoRepo,
      sessaoExercicioRepository: sessaoExRepo,
      exerciseRepository: exerciseRepo,
      serieRegistradaRepository: serieRepo,
    });

    await expect(
      uc.execute({ sessaoExercicioId: 'se-1', novoExercicioId: 'ex-2', motivo: null })
    ).resolves.not.toThrow();
  });

  it('throws DuplicateExercicioInSessaoError when new exercise already exists in session', async () => {
    const sessaoRepo = new InMemorySessaoTreinoRepository();
    const sessaoExRepo = new InMemorySessaoExercicioRepository();
    const serieRepo = new InMemorySerieRegistradaRepository();
    const exerciseRepo = new InMemoryExerciseRepository();

    const sessao = makeSessaoAtiva();
    await sessaoRepo.save(sessao);
    await sessaoExRepo.save(makeSessaoExercicio('se-1', 'sessao-1', 'ex-1'));
    await sessaoExRepo.save(makeSessaoExercicio('se-2', 'sessao-1', 'ex-2'));
    await exerciseRepo.save(makeExercise('ex-1'));
    await exerciseRepo.save(makeExercise('ex-2'));

    const uc = new SubstituirExercicioSessaoUseCase({
      sessaoTreinoRepository: sessaoRepo,
      sessaoExercicioRepository: sessaoExRepo,
      exerciseRepository: exerciseRepo,
      serieRegistradaRepository: serieRepo,
    });

    const { DuplicateExercicioInSessaoError } = await import('./SubstituirExercicioSessaoUseCase');
    await expect(
      uc.execute({ sessaoExercicioId: 'se-1', novoExercicioId: 'ex-2', motivo: null })
    ).rejects.toThrow(DuplicateExercicioInSessaoError);
  });
});
