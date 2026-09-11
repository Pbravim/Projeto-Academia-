import { describe, expect, it } from 'vitest';

import { TreinoExercicio } from '../../../domain/treinos/entities/TreinoExercicio';
import { InMemoryTreinoExercicioRepository } from '../../../infrastructure/treinos/InMemoryTreinoExercicioRepository';

import { ListTreinoExerciciosUseCase } from './ListTreinoExerciciosUseCase';

function makeTE(id: string, treinoId: string, ordem: number) {
  return TreinoExercicio.create({
    id,
    treinoId,
    exercicioId: 'ex1',
    ordem,
    seriesRecomendadas: null,
    execucoesRecomendadas: null,
    cargaPadrao: null,
    tempoDescansoSegundos: null,
    metodo: 'normal',
    grupoId: null,
    duracaoRecomendadaSegundos: null,
    distanciaRecomendadaMetros: null,
    intensidadeRecomendada: null,
  });
}

describe('ListTreinoExerciciosUseCase', () => {
  it('returns empty array when no exercises for treino', async () => {
    const repo = new InMemoryTreinoExercicioRepository();
    const result = await new ListTreinoExerciciosUseCase(repo).execute('t1');
    expect(result).toEqual([]);
  });

  it('returns only exercises for the given treino', async () => {
    const repo = new InMemoryTreinoExercicioRepository();
    await repo.save(makeTE('te1', 't1', 0));
    await repo.save(makeTE('te2', 't2', 0));
    const result = await new ListTreinoExerciciosUseCase(repo).execute('t1');
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('te1');
  });

  it('returns exercises sorted by ordem', async () => {
    const repo = new InMemoryTreinoExercicioRepository();
    await repo.save(makeTE('te2', 't1', 1));
    await repo.save(makeTE('te1', 't1', 0));
    const result = await new ListTreinoExerciciosUseCase(repo).execute('t1');
    expect(result[0]!.id).toBe('te1');
    expect(result[1]!.id).toBe('te2');
  });
});
