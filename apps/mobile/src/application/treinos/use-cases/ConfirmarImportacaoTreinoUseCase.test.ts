import { describe, expect, it } from 'vitest';

import type { TransactionPort } from '../../../domain/shared/ports/TransactionPort';
import { InMemoryTreinoExercicioRepository } from '../../../infrastructure/treinos/InMemoryTreinoExercicioRepository';
import { InMemoryTreinoRepository } from '../../../infrastructure/treinos/InMemoryTreinoRepository';
import { DuplicateTreinoError } from '../errors/DuplicateTreinoError';
import { ExercicioJaNoTreinoError } from '../errors/ExercicioJaNoTreinoError';

import { ConfirmarImportacaoTreinoUseCase, type ImportacaoResolvida } from './ConfirmarImportacaoTreinoUseCase';
import { CreateTreinoUseCase } from './CreateTreinoUseCase';

function novoAmbiente() {
  const treinoRepository = new InMemoryTreinoRepository();
  const treinoExercicioRepository = new InMemoryTreinoExercicioRepository();
  const createTreino = new CreateTreinoUseCase({
    treinoRepository,
    idGenerator: () => 'treino-1',
    now: () => new Date('2026-01-01'),
  });
  let idCounter = 0;
  let grupoCounter = 0;
  const uc = new ConfirmarImportacaoTreinoUseCase({
    createTreino,
    treinoExercicioRepository,
    idGenerator: () => `te-${++idCounter}`,
    gerarGrupoId: () => `grupo-${++grupoCounter}`,
  });
  return { treinoRepository, treinoExercicioRepository, createTreino, uc };
}

const propostaDaIssue: ImportacaoResolvida = {
  nome: 'Treino A',
  objetivo: 'Hipertrofia',
  itens: [
    { item: { nome: 'Supino reto com barra', metodo: 'normal', seriesAlvo: 4, repsAlvo: 8, descansoSegundos: 90 }, exercicioId: 'ex-1' },
    { item: { nome: 'Crucifixo inclinado', metodo: 'drop_set', seriesAlvo: 3, repsAlvo: 12 }, exercicioId: 'ex-2' },
    { item: { nome: 'Tríceps corda', metodo: 'normal', seriesAlvo: 3, repsAlvo: 15, grupo: 'A' }, exercicioId: 'ex-3' },
    { item: { nome: 'Tríceps testa', metodo: 'normal', seriesAlvo: 3, repsAlvo: 12, grupo: 'A' }, exercicioId: 'ex-4' },
  ],
};

describe('ConfirmarImportacaoTreinoUseCase', () => {
  it('(a) cria 1 treino + 4 TreinoExercicio com ordem 1..4 e grupo compartilhado nos itens 3 e 4', async () => {
    const { treinoExercicioRepository, uc } = novoAmbiente();

    const treino = await uc.execute(propostaDaIssue);

    expect(treino.objetivo).toBe('Hipertrofia');
    const itens = await treinoExercicioRepository.listByTreinoId(treino.id);
    expect(itens).toHaveLength(4);
    expect(itens.map((i) => i.toPrimitives().ordem)).toEqual([1, 2, 3, 4]);
    expect(itens.map((i) => i.toPrimitives().seriesRecomendadas)).toEqual([4, 3, 3, 3]);
    expect(itens.map((i) => i.toPrimitives().execucoesRecomendadas)).toEqual([8, 12, 15, 12]);
    expect(itens[0].toPrimitives().tempoDescansoSegundos).toBe(90);
    expect(itens.map((i) => i.toPrimitives().metodo)).toEqual(['normal', 'drop_set', 'normal', 'normal']);
    expect(itens[0].toPrimitives().grupoId).toBeNull();
    expect(itens[1].toPrimitives().grupoId).toBeNull();
    expect(itens[2].toPrimitives().grupoId).not.toBeNull();
    expect(itens[2].toPrimitives().grupoId).toBe(itens[3].toPrimitives().grupoId);
  });

  it('(b) dois grupos A e B geram dois grupoId distintos', async () => {
    const { treinoExercicioRepository, uc } = novoAmbiente();
    const proposta: ImportacaoResolvida = {
      nome: 'Treino B',
      itens: [
        { item: { nome: 'X1', metodo: 'normal', grupo: 'A' }, exercicioId: 'ex-1' },
        { item: { nome: 'X2', metodo: 'normal', grupo: 'A' }, exercicioId: 'ex-2' },
        { item: { nome: 'X3', metodo: 'normal', grupo: 'B' }, exercicioId: 'ex-3' },
        { item: { nome: 'X4', metodo: 'normal', grupo: 'B' }, exercicioId: 'ex-4' },
      ],
    };

    const treino = await uc.execute(proposta);
    const itens = await treinoExercicioRepository.listByTreinoId(treino.id);

    expect(itens[0].toPrimitives().grupoId).toBe(itens[1].toPrimitives().grupoId);
    expect(itens[2].toPrimitives().grupoId).toBe(itens[3].toPrimitives().grupoId);
    expect(itens[0].toPrimitives().grupoId).not.toBe(itens[2].toPrimitives().grupoId);
  });

  it('(c) grupo com 1 so membro vira grupoId null', async () => {
    const { treinoExercicioRepository, uc } = novoAmbiente();
    const proposta: ImportacaoResolvida = {
      nome: 'Treino C',
      itens: [{ item: { nome: 'X1', metodo: 'normal', grupo: 'A' }, exercicioId: 'ex-1' }],
    };

    const treino = await uc.execute(proposta);
    const itens = await treinoExercicioRepository.listByTreinoId(treino.id);

    expect(itens[0].toPrimitives().grupoId).toBeNull();
  });

  it('(d) nome duplicado -> DuplicateTreinoError e nenhum TreinoExercicio salvo', async () => {
    const { treinoRepository, treinoExercicioRepository, createTreino } = novoAmbiente();
    await createTreino.execute({ name: 'Treino A' });

    const uc = new ConfirmarImportacaoTreinoUseCase({
      createTreino,
      treinoExercicioRepository,
      idGenerator: () => 'te-x',
      gerarGrupoId: () => 'grupo-x',
    });

    await expect(uc.execute(propostaDaIssue)).rejects.toBeInstanceOf(DuplicateTreinoError);
    const treinos = await treinoRepository.list();
    expect(treinos).toHaveLength(1);
    const salvos = await treinoExercicioRepository.listByTreinoId('treino-1');
    expect(salvos).toHaveLength(0);
  });

  it('(e) com database fake, withTransaction e chamado 1x e envolve todas as escritas', async () => {
    const treinoRepository = new InMemoryTreinoRepository();
    const treinoExercicioRepository = new InMemoryTreinoExercicioRepository();
    const createTreino = new CreateTreinoUseCase({
      treinoRepository,
      idGenerator: () => 'treino-1',
      now: () => new Date('2026-01-01'),
    });
    let chamadas = 0;
    const database: TransactionPort = {
      withTransaction: async (fn) => {
        chamadas += 1;
        return fn();
      },
    };
    const uc = new ConfirmarImportacaoTreinoUseCase({
      createTreino,
      treinoExercicioRepository,
      idGenerator: () => `te-${Math.random()}`,
      gerarGrupoId: () => `grupo-${Math.random()}`,
      database,
    });

    await uc.execute(propostaDaIssue);

    expect(chamadas).toBe(1);
    const itens = await treinoExercicioRepository.listByTreinoId('treino-1');
    expect(itens).toHaveLength(4);
  });

  it('(f) campos ausentes viram null, cargaPadrao sempre null', async () => {
    const { treinoExercicioRepository, uc } = novoAmbiente();
    const proposta: ImportacaoResolvida = {
      nome: 'Treino F',
      itens: [{ item: { nome: 'X1', metodo: 'normal' }, exercicioId: 'ex-1' }],
    };

    const treino = await uc.execute(proposta);
    const [it0] = await treinoExercicioRepository.listByTreinoId(treino.id);

    expect(it0.toPrimitives()).toMatchObject({
      seriesRecomendadas: null,
      execucoesRecomendadas: null,
      cargaPadrao: null,
      tempoDescansoSegundos: null,
      grupoId: null,
      duracaoRecomendadaSegundos: null,
      distanciaRecomendadaMetros: null,
      intensidadeRecomendada: null,
    });
  });

  it('(h) exercicioId repetido em 2 itens -> ExercicioJaNoTreinoError e nada salvo (achado 1)', async () => {
    const { treinoRepository, treinoExercicioRepository, uc } = novoAmbiente();
    const proposta: ImportacaoResolvida = {
      nome: 'Circuito Agachamento/Flexao',
      itens: [
        { item: { nome: 'Agachamento', metodo: 'normal' }, exercicioId: 'ex-1' },
        { item: { nome: 'Flexao', metodo: 'normal' }, exercicioId: 'ex-2' },
        { item: { nome: 'Agachamento', metodo: 'normal' }, exercicioId: 'ex-1' },
      ],
    };

    await expect(uc.execute(proposta)).rejects.toBeInstanceOf(ExercicioJaNoTreinoError);

    expect(await treinoRepository.list()).toHaveLength(0);
    expect(await treinoExercicioRepository.listByTreinoId('treino-1')).toHaveLength(0);
  });

  it('(g) D1: duracaoSegundos/distanciaMetros/intensidade mapeados', async () => {
    const { treinoExercicioRepository, uc } = novoAmbiente();
    const proposta: ImportacaoResolvida = {
      nome: 'Treino G',
      itens: [
        {
          item: { nome: 'Esteira', metodo: 'normal', duracaoSegundos: 600, distanciaMetros: 2000, intensidade: 7 },
          exercicioId: 'ex-1',
        },
      ],
    };

    const treino = await uc.execute(proposta);
    const [it0] = await treinoExercicioRepository.listByTreinoId(treino.id);

    expect(it0.toPrimitives()).toMatchObject({
      duracaoRecomendadaSegundos: 600,
      distanciaRecomendadaMetros: 2000,
      intensidadeRecomendada: 7,
    });
  });
});
