import { describe, expect, it } from 'vitest';

import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { InMemorySessaoExercicioRepository } from '../../../infrastructure/sessoes/InMemorySessaoExercicioRepository';
import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { Exercise } from '../../../domain/exercises/entities/Exercise';
import { SessaoNotFoundError } from '../errors/SessaoNotFoundError';
import { SessaoEncerradaError } from '../errors/SessaoEncerradaError';
import { ExerciseNotFoundError } from '../../exercises/errors/ExerciseNotFoundError';
import { ExercicioJaNaSessaoError } from '../errors/ExercicioJaNaSessaoError';
import { AddExercicioASessaoUseCase } from './AddExercicioASessaoUseCase';

function makeSessao(id = 's1') {
  return SessaoTreino.create({
    id,
    treinoId: 't1',
    treinoNomeSnapshot: 'Treino A',
    dataHoraInicio: new Date('2026-01-01T10:00:00Z'),
  });
}

function makeExercise(id = 'ex1') {
  return Exercise.create({
    id,
    name: 'Supino',
    groupMuscles: ['Peito'],
    category: 'Musculação',
    createdAt: new Date('2026-01-01'),
    isCustom: false,
  });
}

function setup() {
  const sessaoTreinoRepository = new InMemorySessaoTreinoRepository();
  const sessaoExercicioRepository = new InMemorySessaoExercicioRepository();
  const exerciseRepository = new InMemoryExerciseRepository();
  let seq = 0;
  const useCase = new AddExercicioASessaoUseCase({
    sessaoTreinoRepository,
    sessaoExercicioRepository,
    exerciseRepository,
    idGenerator: () => `se${++seq}`,
  });
  return { sessaoTreinoRepository, sessaoExercicioRepository, exerciseRepository, useCase };
}

describe('AddExercicioASessaoUseCase', () => {
  it('adiciona um exercício novo à sessão ativa com snapshot e ordem', async () => {
    const ctx = setup();
    await ctx.sessaoTreinoRepository.save(makeSessao('s1'));
    await ctx.exerciseRepository.save(makeExercise('ex1'));

    const result = await ctx.useCase.execute({ sessaoId: 's1', exercicioId: 'ex1' });

    expect(result.exercicioId).toBe('ex1');
    expect(result.nomeSnapshot).toBe('Supino');
    expect(result.ordem).toBe(1);
    expect(await ctx.sessaoExercicioRepository.findById(result.id)).not.toBeNull();
  });

  it('lança SessaoNotFoundError quando a sessão não existe', async () => {
    const ctx = setup();
    await ctx.exerciseRepository.save(makeExercise('ex1'));
    await expect(ctx.useCase.execute({ sessaoId: 'naoexiste', exercicioId: 'ex1' }))
      .rejects.toBeInstanceOf(SessaoNotFoundError);
  });

  it('lança SessaoEncerradaError quando a sessão já foi finalizada', async () => {
    const ctx = setup();
    await ctx.sessaoTreinoRepository.save(makeSessao('s1').finalizar(new Date('2026-01-01T11:00:00Z')));
    await ctx.exerciseRepository.save(makeExercise('ex1'));
    await expect(ctx.useCase.execute({ sessaoId: 's1', exercicioId: 'ex1' }))
      .rejects.toBeInstanceOf(SessaoEncerradaError);
  });

  it('lança ExerciseNotFoundError quando o exercício não existe no catálogo', async () => {
    const ctx = setup();
    await ctx.sessaoTreinoRepository.save(makeSessao('s1'));
    await expect(ctx.useCase.execute({ sessaoId: 's1', exercicioId: 'fantasma' }))
      .rejects.toBeInstanceOf(ExerciseNotFoundError);
  });

  it('lança ExercicioJaNaSessaoError quando o exercício já está na sessão', async () => {
    const ctx = setup();
    await ctx.sessaoTreinoRepository.save(makeSessao('s1'));
    await ctx.exerciseRepository.save(makeExercise('ex1'));
    await ctx.useCase.execute({ sessaoId: 's1', exercicioId: 'ex1' });

    await expect(ctx.useCase.execute({ sessaoId: 's1', exercicioId: 'ex1' }))
      .rejects.toBeInstanceOf(ExercicioJaNaSessaoError);
  });
});
