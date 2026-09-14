import { describe, expect, it, vi } from 'vitest';

import { Exercise, type ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import { Treino } from '../../../domain/treinos/entities/Treino';
import { TreinoExercicio, type TreinoExercicioPrimitives } from '../../../domain/treinos/entities/TreinoExercicio';
import { casarExercicios } from '../../../domain/treinos/treino-json/casarExercicios';
import { parseTreinoJson } from '../../../domain/treinos/treino-json/parseTreinoJson';
import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';
import { InMemoryTreinoExercicioRepository } from '../../../infrastructure/treinos/InMemoryTreinoExercicioRepository';
import { InMemoryTreinoRepository } from '../../../infrastructure/treinos/InMemoryTreinoRepository';
import { TreinoNotFoundError } from '../errors/TreinoNotFoundError';

import { ConfirmarImportacaoTreinoUseCase, type ImportacaoResolvida } from './ConfirmarImportacaoTreinoUseCase';
import { CreateTreinoUseCase } from './CreateTreinoUseCase';
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

  it('omite (nao lanca) um TreinoExercicio cujo exercicio nao existe mais no catalogo (achado 5)', async () => {
    const treinoRepository = new InMemoryTreinoRepository();
    const treinoExercicioRepository = new InMemoryTreinoExercicioRepository();
    const exerciseRepository = new InMemoryExerciseRepository();

    await treinoRepository.save(Treino.create({ id: 'treino-orfao', name: 'Treino Orfao', createdAt: new Date('2026-01-01') }));
    await treinoExercicioRepository.save(
      TreinoExercicio.create({
        id: 'te-orfao',
        treinoId: 'treino-orfao',
        exercicioId: 'ex-inexistente',
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
    const resultado = await uc.execute('treino-orfao');

    const conteudo = JSON.parse(resultado.conteudo);
    expect(conteudo.exercicios).toEqual([]);
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

  it('round-trip: export -> parse -> casar -> confirmar reproduz os TreinoExercicio originais (por particao de grupo)', async () => {
    const treinoRepository = new InMemoryTreinoRepository();
    const treinoExercicioRepository = new InMemoryTreinoExercicioRepository();
    const exerciseRepository = new InMemoryExerciseRepository();

    const exercicios: ExercisePrimitives[] = [
      Exercise.create({ id: 'ex-1', name: 'Supino reto com barra', groupMuscles: ['Peito'], createdAt: new Date('2026-01-01') }).toPrimitives(),
      Exercise.create({ id: 'ex-2', name: 'Triceps corda', groupMuscles: ['Triceps'], createdAt: new Date('2026-01-01') }).toPrimitives(),
      Exercise.create({ id: 'ex-3', name: 'Triceps testa', groupMuscles: ['Triceps'], createdAt: new Date('2026-01-01') }).toPrimitives(),
      Exercise.create({ id: 'ex-4', name: 'Esteira', groupMuscles: ['Cardio'], createdAt: new Date('2026-01-01') }).toPrimitives(),
    ];
    for (const exercicio of exercicios) await exerciseRepository.save(Exercise.restore(exercicio));

    await treinoRepository.save(Treino.create({ id: 'treino-rt', name: 'Treino Round Trip', objetivo: 'Hipertrofia', createdAt: new Date('2026-01-01') }));

    const originais: TreinoExercicioPrimitives[] = [
      { id: 'te-1', treinoId: 'treino-rt', exercicioId: 'ex-1', ordem: 1, seriesRecomendadas: 4, execucoesRecomendadas: 8, cargaPadrao: null, tempoDescansoSegundos: 90, metodo: 'normal', grupoId: null, duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null },
      { id: 'te-2', treinoId: 'treino-rt', exercicioId: 'ex-2', ordem: 2, seriesRecomendadas: 3, execucoesRecomendadas: 15, cargaPadrao: null, tempoDescansoSegundos: 60, metodo: 'normal', grupoId: 'g1', duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null },
      { id: 'te-3', treinoId: 'treino-rt', exercicioId: 'ex-3', ordem: 3, seriesRecomendadas: 3, execucoesRecomendadas: 12, cargaPadrao: null, tempoDescansoSegundos: 60, metodo: 'normal', grupoId: 'g1', duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null },
      { id: 'te-4', treinoId: 'treino-rt', exercicioId: 'ex-4', ordem: 4, seriesRecomendadas: null, execucoesRecomendadas: null, cargaPadrao: null, tempoDescansoSegundos: null, metodo: 'normal', grupoId: null, duracaoRecomendadaSegundos: 600, distanciaRecomendadaMetros: 2000, intensidadeRecomendada: 7 },
    ];
    for (const original of originais) await treinoExercicioRepository.save(TreinoExercicio.create(original));

    const exportarUc = new ExportarTreinoUseCase({ treinoRepository, treinoExercicioRepository, exerciseRepository });
    const { conteudo } = await exportarUc.execute('treino-rt');

    const parseResult = parseTreinoJson(conteudo);
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    const propostaItens = casarExercicios(parseResult.treino.exercicios, exercicios);
    expect(propostaItens.every((i) => i.status === 'casado')).toBe(true);

    const resolvida: ImportacaoResolvida = {
      nome: `${parseResult.treino.nome} (reimportado)`,
      objetivo: parseResult.treino.objetivo,
      itens: propostaItens.map((i) => ({ item: i.item, exercicioId: (i.exercicio as ExercisePrimitives).id })),
    };

    let idCounter = 0;
    let grupoCounter = 0;
    const confirmarUc = new ConfirmarImportacaoTreinoUseCase({
      createTreino: new CreateTreinoUseCase({ treinoRepository, idGenerator: () => 'treino-rt-2', now: () => new Date('2026-02-01') }),
      treinoExercicioRepository,
      idGenerator: () => `te-rt-${++idCounter}`,
      gerarGrupoId: () => `grupo-rt-${++grupoCounter}`,
    });

    const novoTreino = await confirmarUc.execute(resolvida);
    expect(novoTreino.objetivo).toBe('Hipertrofia');
    const reconstruidos = await treinoExercicioRepository.listByTreinoId(novoTreino.id);
    const reconstruidosPrimitives = reconstruidos.map((te) => te.toPrimitives());

    const semIdentidade = (te: TreinoExercicioPrimitives) => {
      const { id: _id, treinoId: _treinoId, grupoId: _grupoId, ...resto } = te;
      return resto;
    };
    expect(reconstruidosPrimitives.map(semIdentidade)).toEqual(originais.map(semIdentidade));

    const particao = (itens: TreinoExercicioPrimitives[]) =>
      itens.map((te) => itens.findIndex((outro) => outro.grupoId !== null && outro.grupoId === te.grupoId));
    expect(particao(reconstruidosPrimitives)).toEqual(particao(originais));
  });
});
