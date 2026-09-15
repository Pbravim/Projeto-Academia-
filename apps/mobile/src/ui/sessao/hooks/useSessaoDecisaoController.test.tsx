import { describe, expect, it, vi } from 'vitest';

import type { DecisaoFinalizacao } from '../../../application/sessoes/use-cases/GetDecisaoFinalizacaoUseCase';
import { DuplicateTreinoError } from '../../../application/treinos/errors/DuplicateTreinoError';
import { act,renderHook } from '../../../test/renderHook';

import {
  type SessaoDecisaoControllerDependencies,
  useSessaoDecisaoController,
} from './useSessaoDecisaoController';

// The i18n module pulls expo-localization and the SQLite database client
vi.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'pt-BR' }] }));
vi.mock('expo-sqlite', () => ({}));

const decisaoSalvar: DecisaoFinalizacao = {
  tipo: 'salvar_como_treino',
  nomeAtual: 'Treino livre 13/09',
  totalExercicios: 2,
};

const decisaoAdicionar: DecisaoFinalizacao = {
  tipo: 'adicionar_ao_treino',
  treinoId: 't1',
  treinoNome: 'Treino A',
  avulsos: [
    { sessaoExercicioId: 'se1', exercicioId: 'ex1', nome: 'Supino', seriesValidas: 3 },
    { sessaoExercicioId: 'se2', exercicioId: 'ex2', nome: 'Remada', seriesValidas: 2 },
  ],
};

function makeDeps(overrides?: Partial<SessaoDecisaoControllerDependencies>): SessaoDecisaoControllerDependencies {
  return {
    salvarSessaoComoTreino: { execute: vi.fn().mockResolvedValue({ id: 'novo-treino' }) } as never,
    adicionarExerciciosAoTreino: { execute: vi.fn().mockResolvedValue([]) } as never,
    logger: { info: vi.fn(), error: vi.fn() } as never,
    ...overrides,
  };
}

describe('useSessaoDecisaoController', () => {
  it('pre-fills nome with nomeAtual for salvar_como_treino', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() =>
      useSessaoDecisaoController('s1', decisaoSalvar, deps, vi.fn()),
    );
    expect(result.current.nome).toBe('Treino livre 13/09');
  });

  it('starts with all avulsos selected for adicionar_ao_treino', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() =>
      useSessaoDecisaoController('s1', decisaoAdicionar, deps, vi.fn()),
    );
    expect(result.current.selecionados).toEqual(new Set(['se1', 'se2']));
  });

  it('onSalvarComoTreino calls the use case with the edited nome and concludes', async () => {
    const deps = makeDeps();
    const onConcluido = vi.fn();
    const { result } = await renderHook(() =>
      useSessaoDecisaoController('s1', decisaoSalvar, deps, onConcluido),
    );
    await act(async () => { result.current.onChangeNome('Treino de Pernas'); });
    await act(async () => { await result.current.onSalvarComoTreino(); });
    expect(deps.salvarSessaoComoTreino.execute).toHaveBeenCalledWith({ sessaoId: 's1', nome: 'Treino de Pernas' });
    expect(onConcluido).toHaveBeenCalledTimes(1);
  });

  it('onSalvarComoTreino surfaces nomeDuplicado on DuplicateTreinoError', async () => {
    const deps = makeDeps({
      salvarSessaoComoTreino: {
        execute: vi.fn().mockRejectedValue(new DuplicateTreinoError('Treino A')),
      } as never,
    });
    const onConcluido = vi.fn();
    const { result } = await renderHook(() =>
      useSessaoDecisaoController('s1', decisaoSalvar, deps, onConcluido),
    );
    await act(async () => { await result.current.onSalvarComoTreino(); });
    expect(result.current.errorMessage).toBe('Já existe um treino com esse nome.');
    expect(onConcluido).not.toHaveBeenCalled();
    expect(result.current.isSalvando).toBe(false);
  });

  it('onSalvarComoTreino surfaces a generic error for unknown failures', async () => {
    const deps = makeDeps({
      salvarSessaoComoTreino: { execute: vi.fn().mockRejectedValue(new Error('db down')) } as never,
    });
    const { result } = await renderHook(() =>
      useSessaoDecisaoController('s1', decisaoSalvar, deps, vi.fn()),
    );
    await act(async () => { await result.current.onSalvarComoTreino(); });
    expect(result.current.errorMessage).toBe('Não foi possível concluir a ação.');
  });

  it('onToggleSelecionado adds and removes ids from the selection', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() =>
      useSessaoDecisaoController('s1', decisaoAdicionar, deps, vi.fn()),
    );
    await act(async () => { result.current.onToggleSelecionado('se1'); });
    expect(result.current.selecionados).toEqual(new Set(['se2']));
    await act(async () => { result.current.onToggleSelecionado('se1'); });
    expect(result.current.selecionados).toEqual(new Set(['se1', 'se2']));
  });

  it('onAdicionarSelecionados calls the use case with only the selected ids and concludes', async () => {
    const deps = makeDeps();
    const onConcluido = vi.fn();
    const { result } = await renderHook(() =>
      useSessaoDecisaoController('s1', decisaoAdicionar, deps, onConcluido),
    );
    await act(async () => { result.current.onToggleSelecionado('se2'); });
    await act(async () => { await result.current.onAdicionarSelecionados(); });
    expect(deps.adicionarExerciciosAoTreino.execute).toHaveBeenCalledWith({ sessaoId: 's1', exercicioIds: ['se1'] });
    expect(onConcluido).toHaveBeenCalledTimes(1);
  });

  it('onAdicionarSelecionados surfaces a generic error on failure', async () => {
    const deps = makeDeps({
      adicionarExerciciosAoTreino: { execute: vi.fn().mockRejectedValue(new Error('boom')) } as never,
    });
    const onConcluido = vi.fn();
    const { result } = await renderHook(() =>
      useSessaoDecisaoController('s1', decisaoAdicionar, deps, onConcluido),
    );
    await act(async () => { await result.current.onAdicionarSelecionados(); });
    expect(result.current.errorMessage).toBe('Não foi possível concluir a ação.');
    expect(onConcluido).not.toHaveBeenCalled();
  });

  it('onIgnorar concludes without calling either use case ("nao salvar"/"manter")', async () => {
    const deps = makeDeps();
    const onConcluido = vi.fn();
    const { result } = await renderHook(() =>
      useSessaoDecisaoController('s1', decisaoSalvar, deps, onConcluido),
    );
    await act(async () => { result.current.onIgnorar(); });
    expect(onConcluido).toHaveBeenCalledTimes(1);
    expect(deps.salvarSessaoComoTreino.execute).not.toHaveBeenCalled();
    expect(deps.adicionarExerciciosAoTreino.execute).not.toHaveBeenCalled();
  });
});
