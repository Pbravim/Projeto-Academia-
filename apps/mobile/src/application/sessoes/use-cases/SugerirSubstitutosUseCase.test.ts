import { describe, expect, it } from 'vitest';
import { InMemorySessaoExercicioRepository } from '../../../infrastructure/sessoes/InMemorySessaoExercicioRepository';
import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';
import { InMemoryHistoricoRepository } from '../../../infrastructure/historico/InMemoryHistoricoRepository';
import { SessaoExercicio } from '../../../domain/sessoes/entities/SessaoExercicio';
import { Exercise } from '../../../domain/exercises/entities/Exercise';
import { SugerirSubstitutosUseCase } from './SugerirSubstitutosUseCase';

function makeSE(id: string, exercicioId: string, grupoMuscular = 'Peito', musculoAlvo: string[] = []) {
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
}

function makeExercise(id: string, groupMuscle: string) {
  return Exercise.create({
    id,
    name: `Ex-${id}`,
    groupMuscle,
    createdAt: new Date('2026-01-01'),
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
});
