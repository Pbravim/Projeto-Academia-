import { describe, expect, it } from 'vitest';

import { Exercise } from '../../../domain/exercises/entities/Exercise';
import { SessaoExercicio } from '../../../domain/sessoes/entities/SessaoExercicio';
import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';
import { InMemoryHistoricoRepository } from '../../../infrastructure/historico/InMemoryHistoricoRepository';
import { InMemorySessaoExercicioRepository } from '../../../infrastructure/sessoes/InMemorySessaoExercicioRepository';

import { SugerirSubstitutosUseCase } from './SugerirSubstitutosUseCase';

function makeSE(
  id: string,
  exercicioId: string,
  grupoMuscular = 'Peito',
  musculoAlvo: string[] = [],
  movementPattern: string | null = null,
) {
  return SessaoExercicio.create({
    id,
    sessaoTreinoId: 's1',
    exercicioId,
    ordem: 0,
    nomeSnapshot: `Ex-${exercicioId}`,
    grupoMuscularSnapshot: grupoMuscular,
    categoriaSnapshot: 'Composto',
    equipamentoSnapshot: null,
    musculoAlvoSnapshot: musculoAlvo,
    movementPatternSnapshot: movementPattern,
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

function makeExercise(id: string, groupMuscle: string) {
  return Exercise.create({
    id,
    name: `Ex-${id}`,
    groupMuscles: [groupMuscle],
    createdAt: new Date('2026-01-01'),
  });
}

function makeExerciseWithPattern(
  id: string,
  groupMuscle: string,
  musculoAlvo: string[] = [],
  movementPattern: string | null = null,
) {
  return Exercise.create({
    id,
    name: `Ex-${id}`,
    groupMuscles: [groupMuscle],
    createdAt: new Date('2026-01-01'),
    musculoAlvo,
    movementPattern,
  });
}

describe('SugerirSubstitutosUseCase', () => {
  it('throws when sessaoExercicio not found', async () => {
    const useCase = new SugerirSubstitutosUseCase({
      sessaoExercicioRepository: new InMemorySessaoExercicioRepository(),
      exerciseRepository: new InMemoryExerciseRepository(),
      historicoRepository: new InMemoryHistoricoRepository(),
    });
    await expect(useCase.execute('nonexistent')).rejects.toThrow();
  });

  it('suggests exercises with same muscle group', async () => {
    const seRepo = new InMemorySessaoExercicioRepository();
    const exRepo = new InMemoryExerciseRepository();

    await seRepo.save(makeSE('se1', 'ex1', 'Peito'));
    await exRepo.save(makeExercise('ex1', 'Peito'));
    await exRepo.save(makeExercise('ex2', 'Peito'));
    await exRepo.save(makeExercise('ex3', 'Costas'));

    const useCase = new SugerirSubstitutosUseCase({
      sessaoExercicioRepository: seRepo,
      exerciseRepository: exRepo,
      historicoRepository: new InMemoryHistoricoRepository(),
    });

    const result = await useCase.execute('se1');
    const ids = result.map((r) => r.exercicio.id);
    expect(ids).toContain('ex2');
    expect(ids).not.toContain('ex1');
    expect(ids).not.toContain('ex3');
  });

  it('excludes exercises already in the session', async () => {
    const seRepo = new InMemorySessaoExercicioRepository();
    const exRepo = new InMemoryExerciseRepository();

    // Two exercises already in the session
    await seRepo.save(makeSE('se1', 'ex1', 'Peito'));
    await seRepo.save(makeSE('se2', 'ex2', 'Peito'));
    await exRepo.save(makeExercise('ex1', 'Peito'));
    await exRepo.save(makeExercise('ex2', 'Peito'));
    await exRepo.save(makeExercise('ex3', 'Peito'));

    const useCase = new SugerirSubstitutosUseCase({
      sessaoExercicioRepository: seRepo,
      exerciseRepository: exRepo,
      historicoRepository: new InMemoryHistoricoRepository(),
    });

    const result = await useCase.execute('se1');
    const ids = result.map((r) => r.exercicio.id);
    expect(ids).toContain('ex3');
    expect(ids).not.toContain('ex1');
    expect(ids).not.toContain('ex2');
  });

  it('uses exact group intersection — does not match when groups differ', async () => {
    const seRepo = new InMemorySessaoExercicioRepository();
    const exRepo = new InMemoryExerciseRepository();

    await seRepo.save(makeSE('se1', 'ex1', 'Peito'));
    await exRepo.save(makeExercise('ex1', 'Peito'));
    await exRepo.save(makeExercise('ex2', 'Costas')); // different group — should not appear

    const useCase = new SugerirSubstitutosUseCase({
      sessaoExercicioRepository: seRepo,
      exerciseRepository: exRepo,
      historicoRepository: new InMemoryHistoricoRepository(),
    });

    const result = await useCase.execute('se1');
    const ids = result.map((r) => r.exercicio.id);
    expect(ids).not.toContain('ex2');
  });

  it('layer 1 (quase_igual): same movement AND muscle overlap ranks above same-group-only', async () => {
    const seRepo = new InMemorySessaoExercicioRepository();
    const exRepo = new InMemoryExerciseRepository();

    // The exercise being substituted
    await seRepo.save(makeSE('se1', 'ex1', 'Peito', ['peitoral_medio'], 'Horizontal Push'));
    await exRepo.save(makeExerciseWithPattern('ex1', 'Peito', ['peitoral_medio'], 'Horizontal Push'));
    // quase_igual — same pattern AND muscle
    await exRepo.save(makeExerciseWithPattern('ex2', 'Peito', ['peitoral_medio'], 'Horizontal Push'));
    // similar — same pattern, different muscle
    await exRepo.save(makeExerciseWithPattern('ex3', 'Peito', ['peitoral_inferior'], 'Horizontal Push'));
    // mesmo_grupo — different pattern, same group
    await exRepo.save(makeExerciseWithPattern('ex4', 'Peito', ['peitoral_medio'], 'Vertical Push'));

    const useCase = new SugerirSubstitutosUseCase({
      sessaoExercicioRepository: seRepo,
      exerciseRepository: exRepo,
      historicoRepository: new InMemoryHistoricoRepository(),
    });

    const result = await useCase.execute('se1');
    const ex2 = result.find((r) => r.exercicio.id === 'ex2');
    const ex3 = result.find((r) => r.exercicio.id === 'ex3');
    const ex4 = result.find((r) => r.exercicio.id === 'ex4');

    expect(ex2?.similaridade).toBe('quase_igual');
    expect(ex3?.similaridade).toBe('similar');
    expect(ex4?.similaridade).toBe('mesmo_grupo');

    const ids = result.map((r) => r.exercicio.id);
    expect(ids.indexOf('ex2')).toBeLessThan(ids.indexOf('ex3'));
    expect(ids.indexOf('ex3')).toBeLessThan(ids.indexOf('ex4'));
  });

  it('falls back gracefully when exercises have no movement_pattern set', async () => {
    const seRepo = new InMemorySessaoExercicioRepository();
    const exRepo = new InMemoryExerciseRepository();

    await seRepo.save(makeSE('se1', 'ex1', 'Peito', []));
    await exRepo.save(makeExercise('ex1', 'Peito'));
    await exRepo.save(makeExercise('ex2', 'Peito'));

    const useCase = new SugerirSubstitutosUseCase({
      sessaoExercicioRepository: seRepo,
      exerciseRepository: exRepo,
      historicoRepository: new InMemoryHistoricoRepository(),
    });

    const result = await useCase.execute('se1');
    expect(result.map((r) => r.exercicio.id)).toContain('ex2');
    expect(result[0].similaridade).toBe('mesmo_grupo');
  });
});
