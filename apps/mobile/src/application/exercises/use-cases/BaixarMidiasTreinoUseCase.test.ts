import { describe, expect, it, vi } from 'vitest';

// Mock expo-file-system before importing anything that depends on it
vi.mock('expo-file-system', () => ({
  File: class {},
  Paths: { document: '/mock' },
  Directory: class {},
}));

import { Exercise } from '../../../domain/exercises/entities/Exercise';
import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';
import { InMemoryTreinoExercicioRepository } from '../../../infrastructure/treinos/InMemoryTreinoExercicioRepository';
import type { TreinoExercicioPrimitives } from '../../../domain/treinos/entities/TreinoExercicio';

function makeExercise(id: string, opts: { mediaOnline?: string; mediaLocal?: string } = {}) {
  return Exercise.create({
    id,
    name: `Exercise ${id}`,
    groupMuscles: ['Peito'],
    category: 'Composto',
    createdAt: new Date('2026-01-01'),
    mediaOnline: opts.mediaOnline ?? null,
    mediaLocal: opts.mediaLocal ?? null,
  });
}

function makeTreinoExercicio(props: TreinoExercicioPrimitives) {
  return {
    toPrimitives: () => props,
  };
}

describe('BaixarMidiasTreinoUseCase', () => {
  it('uses findByIds instead of N individual findById calls', async () => {
    // Dynamic import to avoid loading expo-file-system at parse time
    const { BaixarMidiasTreinoUseCase } = await import('./BaixarMidiasTreinoUseCase');

    const exerciseRepo = new InMemoryExerciseRepository();
    const treinoExercicioRepo = new InMemoryTreinoExercicioRepository();

    const ex1 = makeExercise('ex-1', { mediaOnline: 'https://example.com/a.gif' });
    const ex2 = makeExercise('ex-2', { mediaOnline: 'https://example.com/b.gif' });
    await exerciseRepo.save(ex1);
    await exerciseRepo.save(ex2);

    const te1 = makeTreinoExercicio({ id: 'te-1', treinoId: 'treino-1', exercicioId: 'ex-1', ordem: 1, seriesRecomendadas: null, execucoesRecomendadas: null, cargaPadrao: null, tempoDescansoSegundos: null, metodo: 'normal', grupoId: null, duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null });
    const te2 = makeTreinoExercicio({ id: 'te-2', treinoId: 'treino-1', exercicioId: 'ex-2', ordem: 2, seriesRecomendadas: null, execucoesRecomendadas: null, cargaPadrao: null, tempoDescansoSegundos: null, metodo: 'normal', grupoId: null, duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null });
    await treinoExercicioRepo.save(te1 as any);
    await treinoExercicioRepo.save(te2 as any);

    const findByIdsSpy = vi.spyOn(exerciseRepo, 'findByIds');
    const findByIdSpy = vi.spyOn(exerciseRepo, 'findById');

    const mockBaixarMidia = { execute: vi.fn().mockResolvedValue(undefined) };

    const uc = new BaixarMidiasTreinoUseCase({
      exerciseRepository: exerciseRepo,
      treinoExercicioRepository: treinoExercicioRepo,
      baixarMidia: mockBaixarMidia as any,
    });

    await uc.execute('treino-1');

    expect(findByIdsSpy).toHaveBeenCalledOnce();
    expect(findByIdSpy).not.toHaveBeenCalled();
    expect(mockBaixarMidia.execute).toHaveBeenCalledTimes(2);
  });

  it('returns correct counts of baixados and ignorados', async () => {
    // Dynamic import to avoid loading expo-file-system at parse time
    const { BaixarMidiasTreinoUseCase } = await import('./BaixarMidiasTreinoUseCase');

    const exerciseRepo = new InMemoryExerciseRepository();
    const treinoExercicioRepo = new InMemoryTreinoExercicioRepository();

    const comMidia = makeExercise('ex-1', { mediaOnline: 'https://example.com/a.gif' });
    const semMidia = makeExercise('ex-2');
    const jaTemLocal = makeExercise('ex-3', { mediaOnline: 'https://example.com/b.gif', mediaLocal: 'local.gif' });
    await exerciseRepo.save(comMidia);
    await exerciseRepo.save(semMidia);
    await exerciseRepo.save(jaTemLocal);

    for (const [i, id] of ['ex-1', 'ex-2', 'ex-3'].entries()) {
      await treinoExercicioRepo.save(
        makeTreinoExercicio({ id: `te-${i + 1}`, treinoId: 'treino-1', exercicioId: id, ordem: i + 1, seriesRecomendadas: null, execucoesRecomendadas: null, cargaPadrao: null, tempoDescansoSegundos: null, metodo: 'normal', grupoId: null, duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null }) as any
      );
    }

    const mockBaixarMidia = { execute: vi.fn().mockResolvedValue(undefined) };
    const uc = new BaixarMidiasTreinoUseCase({
      exerciseRepository: exerciseRepo,
      treinoExercicioRepository: treinoExercicioRepo,
      baixarMidia: mockBaixarMidia as any,
    });

    const result = await uc.execute('treino-1');

    expect(result.baixados).toBe(1);
    expect(result.ignorados).toBe(2);
  });
});
