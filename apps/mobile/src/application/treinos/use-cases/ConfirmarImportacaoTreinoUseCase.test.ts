import { describe, expect, it } from 'vitest';

import type { TransactionPort } from '../../../domain/shared/ports/TransactionPort';
import type { TreinoExercicioRepository } from '../../../domain/treinos/repositories/TreinoExercicioRepository';
import type { TreinoRepository } from '../../../domain/treinos/repositories/TreinoRepository';
import { InMemoryTreinoExercicioRepository } from '../../../infrastructure/treinos/InMemoryTreinoExercicioRepository';
import { InMemoryTreinoRepository } from '../../../infrastructure/treinos/InMemoryTreinoRepository';
import { DuplicateTreinoError } from '../errors/DuplicateTreinoError';
import { ExercicioJaNoTreinoError } from '../errors/ExercicioJaNoTreinoError';

import { ConfirmarImportacaoTreinoUseCase, type ImportacaoResolvida } from './ConfirmarImportacaoTreinoUseCase';
import { CreateTreinoUseCase } from './CreateTreinoUseCase';

/** Repositorio que registra 'save:treino' no log ANTES de delegar — usado para provar
 * que as escritas do achado 3 (review-38a-1) ficam dentro da janela inicio/fim da transacao. */
function treinoRepositoryComLog(log: string[]): TreinoRepository {
  const base = new InMemoryTreinoRepository();
  return {
    save: async (treino) => {
      log.push('save:treino');
      await base.save(treino);
    },
    list: () => base.list(),
    findById: (id) => base.findById(id),
    delete: (id) => base.delete(id),
  };
}

function treinoExercicioRepositoryComLog(log: string[]): TreinoExercicioRepository {
  const base = new InMemoryTreinoExercicioRepository();
  return {
    save: async (treinoExercicio) => {
      log.push('save:te');
      await base.save(treinoExercicio);
    },
    listByTreinoId: (treinoId) => base.listByTreinoId(treinoId),
    findById: (id) => base.findById(id),
    findByTreinoIdAndExercicioId: (treinoId, exercicioId) => base.findByTreinoIdAndExercicioId(treinoId, exercicioId),
    countByTreinoId: (treinoId) => base.countByTreinoId(treinoId),
    countAllByTreino: () => base.countAllByTreino(),
    maxOrdemByTreinoId: (treinoId) => base.maxOrdemByTreinoId(treinoId),
    findTombstonedId: (treinoId, exercicioId) => base.findTombstonedId(treinoId, exercicioId),
    updateOrdem: (id, ordem) => base.updateOrdem(id, ordem),
    updateRecomendacoes: (id, series, execucoes, carga, descanso) => base.updateRecomendacoes(id, series, execucoes, carga, descanso),
    updateMetodoGrupo: (id, metodo, grupoId) => base.updateMetodoGrupo(id, metodo, grupoId),
    delete: (id) => base.delete(id),
    deleteByTreinoId: (treinoId) => base.deleteByTreinoId(treinoId),
    deleteByExercicioId: (exercicioId) => base.deleteByExercicioId(exercicioId),
  };
}

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

// Proposta no formato da issue #38 (nao e um transcrito literal — ver achado 4, review-38a-1).
const propostaDaIssue: ImportacaoResolvida = {
  nome: 'Treino A',
  objetivo: 'Hipertrofia',
  itens: [
    { item: { nome: 'Supino reto com barra', metodo: 'normal', seriesAlvo: 4, repsAlvo: 8, descansoSegundos: 90 }, exercicioId: 'ex-1' },
    { item: { nome: 'Crucifixo inclinado', metodo: 'drop_set', seriesAlvo: 3, repsAlvo: 12 }, exercicioId: 'ex-2' },
    { item: { nome: 'Tríceps corda', metodo: 'normal', seriesAlvo: 3, repsAlvo: 12, grupo: 'A' }, exercicioId: 'ex-3' },
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
    expect(itens.map((i) => i.toPrimitives().execucoesRecomendadas)).toEqual([8, 12, 12, 12]);
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

  it('(e) com database fake, withTransaction e chamado 1x e TODAS as escritas ficam entre inicio e fim (log de ordem)', async () => {
    const log: string[] = [];
    const treinoRepository = treinoRepositoryComLog(log);
    const treinoExercicioRepository = treinoExercicioRepositoryComLog(log);
    const createTreino = new CreateTreinoUseCase({
      treinoRepository,
      idGenerator: () => 'treino-1',
      now: () => new Date('2026-01-01'),
    });
    let chamadas = 0;
    const database: TransactionPort = {
      withTransaction: async (fn) => {
        chamadas += 1;
        log.push('inicio');
        const resultado = await fn();
        log.push('fim');
        return resultado;
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

    expect(log[0]).toBe('inicio');
    expect(log[log.length - 1]).toBe('fim');
    const escritas = log.slice(1, -1);
    expect(escritas).toEqual(['save:treino', 'save:te', 'save:te', 'save:te', 'save:te']);
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
