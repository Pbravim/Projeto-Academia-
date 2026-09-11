import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardFeature } from './DashboardFeature';

/**
 * Smoke test de render: este componente (a máquina de views do dashboard —
 * dashboard/recordes/evolução/sessões) nunca era executado por teste. As duas
 * hooks e as 4 telas viram stubs — o que se exercita é a navegação entre
 * views do próprio `DashboardFeature`.
 */

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode),
);

vi.mock('react-native', () => ({
  BackHandler: { addEventListener: vi.fn(() => ({ remove: vi.fn() })) },
}));

const controllerState = vi.hoisted(() => ({
  stats: {
    recordesPessoais: [{ exercicioNome: 'Supino', melhorOrmKg: 90 }],
    evolucaoPorTreino: [
      {
        treinoId: 'treino-1',
        treinoNome: 'Treino A',
        sessoes: [{ id: 's1', dataHoraInicio: '2026-01-01', duracaoMin: 40, volumeTotal: 500, melhorOrm: 80 }],
        sessoesArquivadas: [],
      },
    ],
  },
  isLoading: false,
  isResetting: false,
  isExporting: false,
  errorMessage: null,
  onRefresh: vi.fn(),
  onReset: vi.fn(async () => {}),
  onExportar: vi.fn(async () => {}),
  onArquivarSessao: vi.fn(async () => {}),
  onDesarquivarSessao: vi.fn(async () => {}),
  onDeletarSessao: vi.fn(async () => {}),
  onArquivarTodasSessoesTreino: vi.fn(async () => {}),
  onDeletarTodasSessoesTreino: vi.fn(async () => {}),
}));

vi.mock('./hooks/useDashboardController', () => ({
  useDashboardController: vi.fn(() => controllerState),
}));

vi.mock('./hooks/useTreinoEvolucaoController', () => ({
  useTreinoEvolucaoController: vi.fn(() => ({ exercicios: [], isLoading: false, errorMessage: null })),
}));

vi.mock('../shared/tabActivity', () => ({ useTabActive: () => true }));

vi.mock('./screens/DashboardScreen', () => ({
  DashboardScreen: host('DashboardScreen'),
}));
vi.mock('./screens/GerenciarSessoesScreen', () => ({
  GerenciarSessoesScreen: host('GerenciarSessoesScreen'),
}));
vi.mock('./screens/RecordesPessoaisScreen', () => ({
  RecordesPessoaisScreen: host('RecordesPessoaisScreen'),
}));
vi.mock('./screens/TreinoEvolucaoScreen', () => ({
  TreinoEvolucaoScreen: host('TreinoEvolucaoScreen'),
}));

const dependencies = {} as Parameters<typeof DashboardFeature>[0]['dependencies'];

async function render(onGoToSessao?: () => void): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(createElement(DashboardFeature, { dependencies, onGoToSessao }));
  });
  return renderer;
}

describe('DashboardFeature', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza o DashboardScreen por padrão', async () => {
    const renderer = await render();
    expect(renderer.root.findAllByType('DashboardScreen')).toHaveLength(1);
  });

  it('onVerRecordes navega para RecordesPessoaisScreen com os recordes do controller', async () => {
    const renderer = await render();
    const dashboard = renderer.root.findByType('DashboardScreen');

    await act(async () => {
      (dashboard.props as { onVerRecordes: () => void }).onVerRecordes();
    });

    const recordes = renderer.root.findByType('RecordesPessoaisScreen');
    expect(recordes.props.recordes).toEqual(controllerState.stats.recordesPessoais);
    expect(renderer.root.findAllByType('DashboardScreen')).toHaveLength(0);

    await act(async () => {
      (recordes.props as { onBack: () => void }).onBack();
    });
    expect(renderer.root.findAllByType('DashboardScreen')).toHaveLength(1);
  });

  it('onGerenciarSessoes navega para GerenciarSessoesScreen com as sessões do grupo certo', async () => {
    const renderer = await render();
    const dashboard = renderer.root.findByType('DashboardScreen');

    await act(async () => {
      (dashboard.props as { onGerenciarSessoes: (id: string, nome: string) => void }).onGerenciarSessoes(
        'treino-1',
        'Treino A',
      );
    });

    const sessoesScreen = renderer.root.findByType('GerenciarSessoesScreen');
    expect(sessoesScreen.props.treinoNome).toBe('Treino A');
    expect(sessoesScreen.props.sessoes).toEqual(controllerState.stats.evolucaoPorTreino[0].sessoes);

    await act(async () => {
      (sessoesScreen.props as { onArquivar: (id: string) => void }).onArquivar('s1');
    });
    expect(controllerState.onArquivarSessao).toHaveBeenCalledWith('s1');
  });
});
