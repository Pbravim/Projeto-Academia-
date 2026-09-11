import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { ExerciseCatalogFeature } from './ExerciseCatalogFeature';

/**
 * Smoke test de render: este componente (troca entre o catálogo e a tela de
 * histórico de um exercício) nunca era executado por teste. As duas hooks e
 * as duas telas viram stubs — o que se exercita é a navegação do próprio
 * `ExerciseCatalogFeature`.
 */

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode),
);

const catalogState = vi.hoisted(() => ({ items: [] as unknown[] }));

vi.mock('./hooks/useExerciseCatalogController', () => ({
  useExerciseCatalogController: vi.fn((_deps: unknown, onViewHistorico: (id: string, nome: string) => void) => ({
    ...catalogState,
    onViewHistorico,
  })),
}));

vi.mock('../historico/hooks/useHistoricoExercicioController', () => ({
  useHistoricoExercicioController: vi.fn(
    (_id: string, _nome: string, _deps: unknown, onBack: () => void) => ({
      viewModel: null,
      isLoading: false,
      errorMessage: null,
      onRetry: vi.fn(async () => {}),
      onBack,
    }),
  ),
}));

vi.mock('./screens/ExerciseCatalogScreen', () => ({
  ExerciseCatalogScreen: host('ExerciseCatalogScreen'),
}));
vi.mock('../historico/screens/HistoricoExercicioScreen', () => ({
  HistoricoExercicioScreen: host('HistoricoExercicioScreen'),
}));

const dependencies = {} as Parameters<typeof ExerciseCatalogFeature>[0]['dependencies'];

async function render(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(createElement(ExerciseCatalogFeature, { dependencies }));
  });
  return renderer;
}

describe('ExerciseCatalogFeature', () => {
  it('renderiza o catálogo por padrão e navega para o histórico ao chamar onViewHistorico', async () => {
    const renderer = await render();
    expect(renderer.root.findAllByType('ExerciseCatalogScreen')).toHaveLength(1);

    const catalog = renderer.root.findByType('ExerciseCatalogScreen');
    await act(async () => {
      (catalog.props as { onViewHistorico: (id: string, nome: string) => void }).onViewHistorico('ex-1', 'Supino');
    });

    expect(renderer.root.findAllByType('ExerciseCatalogScreen')).toHaveLength(0);
    const historico = renderer.root.findByType('HistoricoExercicioScreen');
    expect(historico).toBeDefined();

    await act(async () => {
      (historico.props as { onBack: () => void }).onBack();
    });
    expect(renderer.root.findAllByType('ExerciseCatalogScreen')).toHaveLength(1);
  });
});
