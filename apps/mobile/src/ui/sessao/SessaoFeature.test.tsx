import { createElement } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import type { SessaoFeatureControllerState } from './hooks/useSessaoFeatureController';
import { SessaoFeature, type SessaoFeatureDependencies } from './SessaoFeature';

/**
 * Smoke test de roteamento: esta tela nunca era executada por teste (só
 * typecheck a protegia — LEARNINGS "suíte verde não prova que a tela abre").
 * Cobre as 5 views (loading/inicio/ativa/decisao/resumo) e o pass-through de
 * onFinalizado(detalhe, decisao) para a view de decisao.
 */

const mockFeatureController = vi.hoisted(() => vi.fn());
const mockAtivaController = vi.hoisted(() => vi.fn());
const mockDecisaoController = vi.hoisted(() => vi.fn());

vi.mock('./hooks/useSessaoFeatureController', () => ({
  useSessaoFeatureController: mockFeatureController,
}));
vi.mock('./hooks/useSessaoAtivaController', () => ({
  useSessaoAtivaController: mockAtivaController,
}));
vi.mock('./hooks/useSessaoDecisaoController', () => ({
  useSessaoDecisaoController: mockDecisaoController,
}));

vi.mock('../shared/LoadingScreen', () => ({
  LoadingScreen: () => createElement('LoadingScreen'),
}));
vi.mock('./screens/SessaoInicioScreen', () => ({
  SessaoInicioScreen: (props: Record<string, unknown>) => createElement('SessaoInicioScreen', props),
}));
vi.mock('./screens/SessaoAtivaScreen', () => ({
  SessaoAtivaScreen: (props: Record<string, unknown>) => createElement('SessaoAtivaScreen', props),
}));
vi.mock('./screens/SessaoResumoScreen', () => ({
  SessaoResumoScreen: (props: Record<string, unknown>) => createElement('SessaoResumoScreen', props),
}));
vi.mock('./screens/SessaoDecisaoScreen', () => ({
  SessaoDecisaoScreen: (props: Record<string, unknown>) => createElement('SessaoDecisaoScreen', props),
}));

const dependencies: SessaoFeatureDependencies = {
  feature: {} as never,
  ativa: {} as never,
  decisao: {} as never,
};

const sessaoAtiva = {
  id: 's1',
  treinoId: 't1',
  treinoNomeSnapshot: 'Treino A',
  dataHoraInicio: '2026-05-21T10:00:00.000Z',
  dataHoraFim: null,
  status: 'em_andamento' as const,
};

const sessaoResumo = { sessao: { ...sessaoAtiva, status: 'finalizada' as const }, exercicios: [] };

function baseFeatureState(overrides: Partial<SessaoFeatureControllerState> = {}): SessaoFeatureControllerState {
  return {
    view: 'loading',
    sessaoAtiva: null,
    sessaoResumo: null,
    decisaoPendente: null,
    treinos: [],
    treinosComExercicios: new Set(),
    sugestao: null,
    errorMessage: null,
    isIniciando: false,
    onIniciarSessao: vi.fn(),
    onIniciarLivre: vi.fn(),
    onSessaoFinalizada: vi.fn(),
    onSessaoCancelada: vi.fn(),
    onFecharResumo: vi.fn(),
    onDecisaoConcluida: vi.fn(),
    ...overrides,
  };
}

describe('SessaoFeature — routing', () => {
  it('renders LoadingScreen for view "loading"', async () => {
    mockFeatureController.mockReturnValue(baseFeatureState({ view: 'loading' }));
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(SessaoFeature, { dependencies }));
    });
    expect(renderer.root.findAllByType('LoadingScreen' as never)).toHaveLength(1);
  });

  it('renders SessaoInicioScreen for view "inicio"', async () => {
    mockFeatureController.mockReturnValue(baseFeatureState({ view: 'inicio' }));
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(SessaoFeature, { dependencies }));
    });
    expect(renderer.root.findAllByType('SessaoInicioScreen' as never)).toHaveLength(1);
  });

  it('renders SessaoAtivaScreen for view "ativa" and forwards onFinalizado(detalhe, decisao)', async () => {
    const onSessaoFinalizada = vi.fn();
    mockFeatureController.mockReturnValue(
      baseFeatureState({ view: 'ativa', sessaoAtiva, onSessaoFinalizada }),
    );
    mockAtivaController.mockImplementation((_sessao, _deps, onFinalizado) => {
      onFinalizado(sessaoResumo, { tipo: 'nenhuma' });
      return { detalhe: sessaoResumo } as never;
    });
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(SessaoFeature, { dependencies }));
    });
    expect(renderer.root.findAllByType('SessaoAtivaScreen' as never)).toHaveLength(1);
    expect(onSessaoFinalizada).toHaveBeenCalledWith(sessaoResumo, { tipo: 'nenhuma' });
  });

  it('renders SessaoDecisaoScreen for view "decisao" with a pending decisao and sessaoResumo', async () => {
    const decisao = { tipo: 'salvar_como_treino' as const, nomeAtual: 'Treino livre 13/09', totalExercicios: 2 };
    mockFeatureController.mockReturnValue(
      baseFeatureState({ view: 'decisao', decisaoPendente: decisao, sessaoResumo }),
    );
    mockDecisaoController.mockReturnValue({ nome: 'x', selecionados: new Set() } as never);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(SessaoFeature, { dependencies }));
    });
    expect(renderer.root.findAllByType('SessaoDecisaoScreen' as never)).toHaveLength(1);
    expect(mockDecisaoController).toHaveBeenCalledWith('s1', decisao, dependencies.decisao, expect.any(Function));
  });

  it('falls back to inicio when view is "decisao" without a pending decisao', async () => {
    mockFeatureController.mockReturnValue(baseFeatureState({ view: 'decisao', decisaoPendente: null }));
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(SessaoFeature, { dependencies }));
    });
    expect(renderer.root.findAllByType('SessaoInicioScreen' as never)).toHaveLength(1);
  });

  it('renders SessaoResumoScreen for view "resumo"', async () => {
    mockFeatureController.mockReturnValue(baseFeatureState({ view: 'resumo', sessaoResumo }));
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(SessaoFeature, { dependencies }));
    });
    expect(renderer.root.findAllByType('SessaoResumoScreen' as never)).toHaveLength(1);
  });
});
