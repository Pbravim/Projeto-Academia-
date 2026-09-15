import { describe, expect, it, vi } from 'vitest';

import { DuplicateExerciseError } from '../../../application/exercises/errors/DuplicateExerciseError';
import { DuplicateTreinoError } from '../../../application/treinos/errors/DuplicateTreinoError';
import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import { TreinoImportError } from '../../../domain/treinos/treino-json/TreinoImportError';
import { act, renderHook } from '../../../test/renderHook';

import { useImportarTreinoController,type UseImportarTreinoControllerDependencies } from './useImportarTreinoController';

vi.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'pt-BR' }] }));
vi.mock('expo-sqlite', () => ({}));

function makeExercise(id: string, name: string): ExercisePrimitives {
  return {
    id,
    name,
    normalizedName: name.toLowerCase(),
    groupMuscles: ['Peito'],
    category: 'Composto',
    equipment: null,
    loadUnit: 'kg',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    mediaOnline: null,
    mediaLocal: null,
    musculoAlvo: [],
    movementPattern: null,
    stabilizers: [],
    executionType: null,
    nameVariations: [],
    primaryEquipment: null,
    secondaryEquipment: null,
    catalogVersion: 0,
    trackingType: 'reps_load',
  };
}

const supino = makeExercise('ex-supino', 'Supino reto com barra');

function makeDependencies(overrides: Partial<UseImportarTreinoControllerDependencies> = {}): UseImportarTreinoControllerDependencies {
  return {
    importarTreino: { execute: vi.fn() } as never,
    confirmarImportacao: { execute: vi.fn() } as never,
    createExercise: { execute: vi.fn() } as never,
    listExercises: { execute: vi.fn().mockResolvedValue([supino]) } as never,
    lerArquivoTexto: vi.fn(),
    logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } as never,
    ...overrides,
  };
}

const flush = async () => {
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
};

const propostaMista = {
  nome: 'Treino A',
  objetivo: null,
  itens: [
    { status: 'casado' as const, item: { nome: 'Supino reto com barra', metodo: 'normal' as const }, exercicio: supino, candidatos: [] },
    { status: 'nao_casado' as const, item: { nome: 'Agachamento', metodo: 'normal' as const }, exercicio: null, candidatos: [] },
  ],
};

describe('useImportarTreinoController', () => {
  it('(a) analisar com texto vazio nao chama o use case e mostra erro', async () => {
    const deps = makeDependencies();
    const { result } = await renderHook(() => useImportarTreinoController(deps, vi.fn()));
    await flush();

    await act(async () => { await result.current.analisar(); });

    expect(deps.importarTreino.execute).not.toHaveBeenCalled();
    expect(result.current.errorMessage).not.toBeNull();
  });

  it('(b) analisar OK vai para revisao com exercicioId preenchido nos casados e null nos nao casados', async () => {
    const deps = makeDependencies({
      importarTreino: { execute: vi.fn().mockResolvedValue(propostaMista) } as never,
    });
    const { result } = await renderHook(() => useImportarTreinoController(deps, vi.fn()));
    await flush();

    await act(async () => { result.current.onChangeTexto('{"schema":"x"}'); });
    await act(async () => { await result.current.analisar(); });

    expect(result.current.etapa).toBe('revisao');
    expect(result.current.itens[0]!.exercicioId).toBe('ex-supino');
    expect(result.current.itens[1]!.exercicioId).toBeNull();
  });

  it('(c) TreinoImportError com code mapeia para a chave i18n; erro generico cai em erros.leitura', async () => {
    const deps = makeDependencies({
      importarTreino: { execute: vi.fn().mockRejectedValue(new TreinoImportError('schema_desconhecido', 'x')) } as never,
    });
    const { result } = await renderHook(() => useImportarTreinoController(deps, vi.fn()));
    await flush();

    await act(async () => { result.current.onChangeTexto('{}'); });
    await act(async () => { await result.current.analisar(); });

    expect(result.current.errorMessage).toBe('Este arquivo usa um schema de treino não suportado.');

    const genericDeps = makeDependencies({
      importarTreino: { execute: vi.fn().mockRejectedValue(new Error('boom')) } as never,
    });
    const { result: result2 } = await renderHook(() => useImportarTreinoController(genericDeps, vi.fn()));
    await flush();
    await act(async () => { result2.current.onChangeTexto('{}'); });
    await act(async () => { await result2.current.analisar(); });

    expect(result2.current.errorMessage).toBe('Não foi possível ler o arquivo.');
  });

  it('(d) podeSalvar falso com item sem exercicioId, verdadeiro apos resolverItem', async () => {
    const deps = makeDependencies({
      importarTreino: { execute: vi.fn().mockResolvedValue(propostaMista) } as never,
    });
    const { result } = await renderHook(() => useImportarTreinoController(deps, vi.fn()));
    await flush();
    await act(async () => { result.current.onChangeTexto('{}'); });
    await act(async () => { await result.current.analisar(); });

    expect(result.current.podeSalvar).toBe(false);

    await act(async () => { result.current.resolverItem(1, 'ex-agachamento'); });

    expect(result.current.podeSalvar).toBe(true);
  });

  it('(e) criarCustom chama createExercise e resolve o item; DuplicateExerciseError deixa o item pendente', async () => {
    const createExercise = { execute: vi.fn().mockResolvedValue(makeExercise('ex-novo', 'Agachamento')) };
    const deps = makeDependencies({
      importarTreino: { execute: vi.fn().mockResolvedValue(propostaMista) } as never,
      createExercise: createExercise as never,
    });
    const { result } = await renderHook(() => useImportarTreinoController(deps, vi.fn()));
    await flush();
    await act(async () => { result.current.onChangeTexto('{}'); });
    await act(async () => { await result.current.analisar(); });

    await act(async () => {
      await result.current.criarCustom(1, { nome: 'Agachamento', groupMuscles: ['Quadriceps'], category: 'Composto' });
    });

    expect(createExercise.execute).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Agachamento', groupMuscles: ['Quadriceps'], category: 'Composto' })
    );
    expect(result.current.itens[1]!.exercicioId).toBe('ex-novo');

    const duplicateDeps = makeDependencies({
      importarTreino: { execute: vi.fn().mockResolvedValue(propostaMista) } as never,
      createExercise: { execute: vi.fn().mockRejectedValue(new DuplicateExerciseError('Agachamento')) } as never,
    });
    const { result: result2 } = await renderHook(() => useImportarTreinoController(duplicateDeps, vi.fn()));
    await flush();
    await act(async () => { result2.current.onChangeTexto('{}'); });
    await act(async () => { await result2.current.analisar(); });

    await act(async () => {
      await result2.current.criarCustom(1, { nome: 'Agachamento', groupMuscles: ['Quadriceps'], category: 'Composto' });
    });

    expect(result2.current.itens[1]!.exercicioId).toBeNull();
    expect(result2.current.errorMessage).not.toBeNull();

    const genericDeps = makeDependencies({
      importarTreino: { execute: vi.fn().mockResolvedValue(propostaMista) } as never,
      createExercise: { execute: vi.fn().mockRejectedValue(new Error('boom')) } as never,
    });
    const { result: result3 } = await renderHook(() => useImportarTreinoController(genericDeps, vi.fn()));
    await flush();
    await act(async () => { result3.current.onChangeTexto('{}'); });
    await act(async () => { await result3.current.analisar(); });

    await act(async () => {
      await result3.current.criarCustom(1, { nome: 'Agachamento', groupMuscles: ['Quadriceps'], category: 'Composto' });
    });

    expect(result3.current.errorMessage).toBe('Não foi possível salvar o treino importado.');
  });

  it('(f) salvar chama confirmarImportacao e dispara onImportado; erro mantem a revisao', async () => {
    const treinoCriado = { id: 't1', name: 'Treino A', objetivo: null, createdAt: 'x', updatedAt: 'x' };
    const confirmarImportacao = { execute: vi.fn().mockResolvedValue(treinoCriado) };
    const onImportado = vi.fn();
    const deps = makeDependencies({
      importarTreino: { execute: vi.fn().mockResolvedValue(propostaMista) } as never,
      confirmarImportacao: confirmarImportacao as never,
    });
    const { result } = await renderHook(() => useImportarTreinoController(deps, onImportado));
    await flush();
    await act(async () => { result.current.onChangeTexto('{}'); });
    await act(async () => { await result.current.analisar(); });
    await act(async () => { result.current.resolverItem(1, 'ex-agachamento'); });

    await act(async () => { await result.current.salvar(); });

    expect(confirmarImportacao.execute).toHaveBeenCalledWith({
      nome: 'Treino A',
      objetivo: null,
      itens: [
        { item: propostaMista.itens[0]!.item, exercicioId: 'ex-supino' },
        { item: propostaMista.itens[1]!.item, exercicioId: 'ex-agachamento' },
      ],
    });
    expect(onImportado).toHaveBeenCalledWith(treinoCriado);

    const failingDeps = makeDependencies({
      importarTreino: { execute: vi.fn().mockResolvedValue(propostaMista) } as never,
      confirmarImportacao: { execute: vi.fn().mockRejectedValue(new DuplicateTreinoError('Treino A')) } as never,
    });
    const onImportado2 = vi.fn();
    const { result: result2 } = await renderHook(() => useImportarTreinoController(failingDeps, onImportado2));
    await flush();
    await act(async () => { result2.current.onChangeTexto('{}'); });
    await act(async () => { await result2.current.analisar(); });
    await act(async () => { result2.current.resolverItem(1, 'ex-agachamento'); });

    await act(async () => { await result2.current.salvar(); });

    expect(onImportado2).not.toHaveBeenCalled();
    expect(result2.current.etapa).toBe('revisao');
    expect(result2.current.errorMessage).not.toBeNull();

    const genericDeps = makeDependencies({
      importarTreino: { execute: vi.fn().mockResolvedValue(propostaMista) } as never,
      confirmarImportacao: { execute: vi.fn().mockRejectedValue(new Error('boom')) } as never,
    });
    const { result: result3 } = await renderHook(() => useImportarTreinoController(genericDeps, vi.fn()));
    await flush();
    await act(async () => { result3.current.onChangeTexto('{}'); });
    await act(async () => { await result3.current.analisar(); });
    await act(async () => { result3.current.resolverItem(1, 'ex-agachamento'); });

    await act(async () => { await result3.current.salvar(); });

    expect(result3.current.errorMessage).toBe('Não foi possível salvar o treino importado.');
  });

  it('(g) escolherArquivo: cancelado nao altera texto; escolhido preenche o texto; rejeicao mostra erro sem alterar o texto', async () => {
    const lerArquivoTexto = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce('{"schema":"x"}');
    const deps = makeDependencies({ lerArquivoTexto });
    const { result } = await renderHook(() => useImportarTreinoController(deps, vi.fn()));
    await flush();

    await act(async () => { await result.current.escolherArquivo(); });
    expect(result.current.texto).toBe('');

    await act(async () => { await result.current.escolherArquivo(); });
    expect(result.current.texto).toBe('{"schema":"x"}');

    const falhandoDeps = makeDependencies({
      lerArquivoTexto: vi.fn().mockRejectedValue(new Error('picker falhou')),
    });
    const { result: result2 } = await renderHook(() => useImportarTreinoController(falhandoDeps, vi.fn()));
    await flush();

    await act(async () => { await result2.current.escolherArquivo(); });

    expect(result2.current.texto).toBe('');
    expect(result2.current.errorMessage).toBe('Não foi possível ler o arquivo.');
  });

  it('(h) salvar com podeSalvar falso e no-op', async () => {
    const confirmarImportacao = { execute: vi.fn() };
    const deps = makeDependencies({
      importarTreino: { execute: vi.fn().mockResolvedValue(propostaMista) } as never,
      confirmarImportacao: confirmarImportacao as never,
    });
    const { result } = await renderHook(() => useImportarTreinoController(deps, vi.fn()));
    await flush();
    await act(async () => { result.current.onChangeTexto('{}'); });
    await act(async () => { await result.current.analisar(); });

    await act(async () => { await result.current.salvar(); });

    expect(confirmarImportacao.execute).not.toHaveBeenCalled();
  });
});
