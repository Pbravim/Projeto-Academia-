import { describe, expect, it, vi } from 'vitest';

import { Exercise } from '../../../domain/exercises/entities/Exercise';
import { Treino } from '../../../domain/treinos/entities/Treino';
import { TreinoExercicio } from '../../../domain/treinos/entities/TreinoExercicio';
import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';
import { InMemoryTreinoExercicioRepository } from '../../../infrastructure/treinos/InMemoryTreinoExercicioRepository';
import { InMemoryTreinoRepository } from '../../../infrastructure/treinos/InMemoryTreinoRepository';
import { TreinoNotFoundError } from '../errors/TreinoNotFoundError';

import { ExportarTreinoUseCase } from './ExportarTreinoUseCase';

describe('ExportarTreinoUseCase', () => {
  it('exporta um treino com nomeArquivo baseado no slug do nome e conteudo serializado', async () => {
    const treinoRepository = new InMemoryTreinoRepository();
    const treinoExercicioRepository = new InMemoryTreinoExercicioRepository();
    const exerciseRepository = new InMemoryExerciseRepository();

    await treinoRepository.save(Treino.create({ id: 'treino-1', name: 'Treino A — Peito', createdAt: new Date('2026-01-01') }));
    await exerciseRepository.save(Exercise.create({ id: 'ex-1', name: 'Supino reto com barra', groupMuscles: ['Peito'], createdAt: new Date('2026-01-01') }));
    await treinoExercicioRepository.save(
      TreinoExercicio.create({
        id: 'te-1',
        treinoId: 'treino-1',
        exercicioId: 'ex-1',
        ordem: 1,
        seriesRecomendadas: 4,
        execucoesRecomendadas: 8,
        cargaPadrao: null,
        tempoDescansoSegundos: 90,
        metodo: 'normal',
        grupoId: null,
        duracaoRecomendadaSegundos: null,
        distanciaRecomendadaMetros: null,
        intensidadeRecomendada: null,
      })
    );

    const uc = new ExportarTreinoUseCase({ treinoRepository, treinoExercicioRepository, exerciseRepository });

    const resultado = await uc.execute('treino-1');

    expect(resultado.nomeArquivo).toBe('treino_treino-a-peito.json');
    const conteudo = JSON.parse(resultado.conteudo);
    expect(conteudo.nome).toBe('Treino A — Peito');
    expect(conteudo.exercicios).toHaveLength(1);
    expect(conteudo.exercicios[0]).toMatchObject({ nome: 'Supino reto com barra', seriesAlvo: 4, repsAlvo: 8 });
  });

  it('TreinoNotFoundError se o treino nao existe', async () => {
    const treinoRepository = new InMemoryTreinoRepository();
    const treinoExercicioRepository = new InMemoryTreinoExercicioRepository();
    const exerciseRepository = new InMemoryExerciseRepository();
    const uc = new ExportarTreinoUseCase({ treinoRepository, treinoExercicioRepository, exerciseRepository });

    await expect(uc.execute('inexistente')).rejects.toBeInstanceOf(TreinoNotFoundError);
  });

  it('usa findByIds uma unica vez', async () => {
    const treinoRepository = new InMemoryTreinoRepository();
    const treinoExercicioRepository = new InMemoryTreinoExercicioRepository();
    const exerciseRepository = new InMemoryExerciseRepository();
    const findByIdsSpy = vi.spyOn(exerciseRepository, 'findByIds');

    await treinoRepository.save(Treino.create({ id: 'treino-1', name: 'Treino Vazio-ish', createdAt: new Date('2026-01-01') }));
    await exerciseRepository.save(Exercise.create({ id: 'ex-1', name: 'Supino', groupMuscles: ['Peito'], createdAt: new Date('2026-01-01') }));
    await treinoExercicioRepository.save(
      TreinoExercicio.create({
        id: 'te-1',
        treinoId: 'treino-1',
        exercicioId: 'ex-1',
        ordem: 1,
        seriesRecomendadas: null,
        execucoesRecomendadas: null,
        cargaPadrao: null,
        tempoDescansoSegundos: null,
        metodo: 'normal',
        grupoId: null,
        duracaoRecomendadaSegundos: null,
        distanciaRecomendadaMetros: null,
        intensidadeRecomendada: null,
      })
    );

    const uc = new ExportarTreinoUseCase({ treinoRepository, treinoExercicioRepository, exerciseRepository });
    await uc.execute('treino-1');

    expect(findByIdsSpy).toHaveBeenCalledTimes(1);
  });
});
