import { describe, expect, it } from 'vitest';

import { Treino } from '../../../domain/treinos/entities/Treino';
import { TreinoExercicio } from '../../../domain/treinos/entities/TreinoExercicio';
import { InMemoryTreinoExercicioRepository } from '../../../infrastructure/treinos/InMemoryTreinoExercicioRepository';
import { InMemoryTreinoRepository } from '../../../infrastructure/treinos/InMemoryTreinoRepository';
import { TreinoExercicioNotFoundError } from '../errors/TreinoExercicioNotFoundError';
import { TreinoNotFoundError } from '../errors/TreinoNotFoundError';

import { ReordenacaoIncompletaError,ReordenarExerciciosUseCase } from './ReordenarExerciciosUseCase';

function makeRepos() {
  return {
    treinoRepo: new InMemoryTreinoRepository(),
    teRepo: new InMemoryTreinoExercicioRepository(),
  };
}

async function setupTreinoComExercicios(treinoRepo: InMemoryTreinoRepository, teRepo: InMemoryTreinoExercicioRepository) {
  const treino = Treino.create({ id: 'treino-1', name: 'Treino A', createdAt: new Date('2026-01-01') });
  await treinoRepo.save(treino);

  const te1 = TreinoExercicio.create({ id: 'te-1', treinoId: 'treino-1', exercicioId: 'ex-1', ordem: 1, seriesRecomendadas: 3, execucoesRecomendadas: 10, cargaPadrao: 20, tempoDescansoSegundos: null, metodo: 'normal', grupoId: null, duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null });
  const te2 = TreinoExercicio.create({ id: 'te-2', treinoId: 'treino-1', exercicioId: 'ex-2', ordem: 2, seriesRecomendadas: 3, execucoesRecomendadas: 10, cargaPadrao: 20, tempoDescansoSegundos: null, metodo: 'normal', grupoId: null, duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null });
  const te3 = TreinoExercicio.create({ id: 'te-3', treinoId: 'treino-1', exercicioId: 'ex-3', ordem: 3, seriesRecomendadas: 3, execucoesRecomendadas: 10, cargaPadrao: 20, tempoDescansoSegundos: null, metodo: 'normal', grupoId: null, duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null });
  await teRepo.save(te1);
  await teRepo.save(te2);
  await teRepo.save(te3);

  return { treino, te1, te2, te3 };
}

describe('ReordenarExerciciosUseCase', () => {
  it('reorders exercises when all IDs are provided', async () => {
    const { treinoRepo, teRepo } = makeRepos();
    await setupTreinoComExercicios(treinoRepo, teRepo);

    const uc = new ReordenarExerciciosUseCase({
      treinoRepository: treinoRepo,
      treinoExercicioRepository: teRepo,
    });

    await uc.execute({ treinoId: 'treino-1', treinoExercicioIds: ['te-3', 'te-1', 'te-2'] });

    const exercicios = await teRepo.listByTreinoId('treino-1');
    const ordered = exercicios.sort((a, b) => a.toPrimitives().ordem - b.toPrimitives().ordem);
    expect(ordered.map((te) => te.toPrimitives().id)).toEqual(['te-3', 'te-1', 'te-2']);
  });

  it('throws TreinoNotFoundError when treino does not exist', async () => {
    const { treinoRepo, teRepo } = makeRepos();
    const uc = new ReordenarExerciciosUseCase({
      treinoRepository: treinoRepo,
      treinoExercicioRepository: teRepo,
    });

    await expect(
      uc.execute({ treinoId: 'nao-existe', treinoExercicioIds: ['te-1'] })
    ).rejects.toThrow(TreinoNotFoundError);
  });

  it('throws TreinoExercicioNotFoundError when input contains an unknown ID', async () => {
    const { treinoRepo, teRepo } = makeRepos();
    await setupTreinoComExercicios(treinoRepo, teRepo);

    const uc = new ReordenarExerciciosUseCase({
      treinoRepository: treinoRepo,
      treinoExercicioRepository: teRepo,
    });

    await expect(
      uc.execute({ treinoId: 'treino-1', treinoExercicioIds: ['te-1', 'te-2', 'id-desconhecido'] })
    ).rejects.toThrow(TreinoExercicioNotFoundError);
  });

  it('throws ReordenacaoIncompletaError when input is missing IDs from the treino', async () => {
    const { treinoRepo, teRepo } = makeRepos();
    await setupTreinoComExercicios(treinoRepo, teRepo);

    const uc = new ReordenarExerciciosUseCase({
      treinoRepository: treinoRepo,
      treinoExercicioRepository: teRepo,
    });

    await expect(
      uc.execute({ treinoId: 'treino-1', treinoExercicioIds: ['te-1', 'te-2'] })
    ).rejects.toThrow(ReordenacaoIncompletaError);
  });
});
