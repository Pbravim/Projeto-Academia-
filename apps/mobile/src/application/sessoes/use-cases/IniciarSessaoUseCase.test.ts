import { describe, expect, it } from 'vitest';

import { Exercise } from '../../../domain/exercises/entities/Exercise';
import { UpdateExerciseUseCase } from '../../exercises/use-cases/UpdateExerciseUseCase';
import { Treino } from '../../../domain/treinos/entities/Treino';
import { TreinoExercicio } from '../../../domain/treinos/entities/TreinoExercicio';
import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';
import { InMemoryTreinoExercicioRepository } from '../../../infrastructure/treinos/InMemoryTreinoExercicioRepository';
import { InMemoryTreinoRepository } from '../../../infrastructure/treinos/InMemoryTreinoRepository';
import { InMemorySessaoExercicioRepository } from '../../../infrastructure/sessoes/InMemorySessaoExercicioRepository';
import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { SessaoJaAtivaError } from '../errors/SessaoJaAtivaError';
import { TreinoNotFoundError } from '../../treinos/errors/TreinoNotFoundError';
import { IniciarSessaoUseCase } from './IniciarSessaoUseCase';

function makeRepos() {
  return {
    sessaoTreinoRepository: new InMemorySessaoTreinoRepository(),
    sessaoExercicioRepository: new InMemorySessaoExercicioRepository(),
    treinoRepository: new InMemoryTreinoRepository(),
    treinoExercicioRepository: new InMemoryTreinoExercicioRepository(),
    exerciseRepository: new InMemoryExerciseRepository(),
  };
}

let counter = 0;
function makeUseCase(repos: ReturnType<typeof makeRepos>) {
  return new IniciarSessaoUseCase({
    ...repos,
    idGenerator: () => `id_${++counter}`,
    now: () => new Date('2026-05-02T10:00:00.000Z'),
  });
}

async function seedTreinoComExercicio(repos: ReturnType<typeof makeRepos>) {
  const treino = Treino.create({ id: 'treino_1', name: 'Treino A', createdAt: new Date() });
  await repos.treinoRepository.save(treino);

  const exercise = Exercise.create({
    id: 'exercise_1',
    name: 'Supino reto',
    groupMuscle: 'Peito',
    category: 'Composto',
    createdAt: new Date(),
  });
  await repos.exerciseRepository.save(exercise);

  const te = TreinoExercicio.create({ id: 'te_1', treinoId: 'treino_1', exercicioId: 'exercise_1', ordem: 1, seriesRecomendadas: null, execucoesRecomendadas: null, cargaPadrao: null });
  await repos.treinoExercicioRepository.save(te);
}

describe('IniciarSessaoUseCase', () => {
  it('creates a session with snapshots from the treino exercises', async () => {
    counter = 0;
    const repos = makeRepos();
    await seedTreinoComExercicio(repos);

    const sessao = await makeUseCase(repos).execute('treino_1');

    expect(sessao.treinoNomeSnapshot).toBe('Treino A');
    expect(sessao.status).toBe('em_andamento');
    expect(sessao.dataHoraFim).toBeNull();

    const exercicios = await repos.sessaoExercicioRepository.listBySessaoId(sessao.id);
    expect(exercicios).toHaveLength(1);
    expect(exercicios[0].toPrimitives().nomeSnapshot).toBe('Supino reto');
    expect(exercicios[0].toPrimitives().realizado).toBe(true);
  });

  it('throws SessaoJaAtivaError when a session is already active', async () => {
    counter = 0;
    const repos = makeRepos();
    await seedTreinoComExercicio(repos);

    const useCase = makeUseCase(repos);
    await useCase.execute('treino_1');

    await expect(useCase.execute('treino_1')).rejects.toThrow(SessaoJaAtivaError);
  });

  it('throws TreinoNotFoundError when treino does not exist', async () => {
    counter = 0;
    const repos = makeRepos();

    await expect(makeUseCase(repos).execute('non_existent')).rejects.toThrow(TreinoNotFoundError);
  });

  it('preserva snapshot mesmo apos edicao posterior do exercicio', async () => {
    counter = 0;
    const repos = makeRepos();
    await seedTreinoComExercicio(repos);

    const sessao = await makeUseCase(repos).execute('treino_1');

    // Simula edicao futura do exercicio no catalogo
    await new UpdateExerciseUseCase({ exerciseRepository: repos.exerciseRepository, now: () => new Date() })
      .execute({ id: 'exercise_1', name: 'Supino inclinado', groupMuscle: 'Peito Superior', category: 'Composto' });

    // O snapshot da sessao ja criada nao deve mudar
    const exercicios = await repos.sessaoExercicioRepository.listBySessaoId(sessao.id);
    expect(exercicios[0].toPrimitives().nomeSnapshot).toBe('Supino reto');
    expect(exercicios[0].toPrimitives().grupoMuscularSnapshot).toBe('Peito');
  });
});
