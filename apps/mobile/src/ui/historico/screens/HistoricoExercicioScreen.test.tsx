import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { HistoricoExercicioScreen } from './HistoricoExercicioScreen';

/** Smoke test de render: esta tela nunca era executada por teste. */

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode),
);

vi.mock('react-native', () => ({
  View: host('View'),
  Text: host('Text'),
  Pressable: host('Pressable'),
  ScrollView: host('ScrollView'),
  ActivityIndicator: host('ActivityIndicator'),
  StyleSheet: { create: (s: unknown) => s },
}));

vi.mock('../../shared/components/SessionSeriesTable', () => ({
  SessionSeriesTable: host('SessionSeriesTable'),
}));

vi.mock('../../shared/hooks/useAndroidBack', () => ({ useAndroidBack: vi.fn() }));

vi.mock('../../shared/LineChart', () => ({ LineChart: host('LineChart') }));

vi.mock('../../shared/theme', async () => {
  const react = await import('react');
  const colors = new Proxy({}, { get: (_t, prop) => String(prop) });
  return {
    ThemeContext: react.createContext(colors),
    useTheme: () => colors,
  };
});

vi.mock('../../shared/i18n', () => ({
  useT: () => (key: string) => key,
}));

async function render(
  props: Parameters<typeof HistoricoExercicioScreen>[0],
): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(createElement(HistoricoExercicioScreen, props));
  });
  return renderer;
}

const viewModel: Parameters<typeof HistoricoExercicioScreen>[0]['viewModel'] = {
  exercicioNome: 'Supino',
  sessionRows: [],
  emptyStateMessage: null,
  rm1ChartPoints: [{ value: 90, label: '01/01' }],
  plateau: null,
};

describe('HistoricoExercicioScreen', () => {
  it('mostra o nome do exercício e chama onBack ao pressionar voltar', async () => {
    const onBack = vi.fn();
    const renderer = await render({
      viewModel,
      isLoading: false,
      errorMessage: null,
      onRetry: vi.fn(async () => {}),
      onBack,
    });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('Supino');

    const back = renderer.root.findAllByType('Pressable')[0];
    await act(async () => {
      (back.props as { onPress: () => void }).onPress();
    });
    expect(onBack).toHaveBeenCalled();
  });

  it('erro: mostra a mensagem e chama onRetry ao pressionar tentar de novo', async () => {
    const onRetry = vi.fn(async () => {});
    const renderer = await render({
      viewModel: { ...viewModel, emptyStateMessage: null },
      isLoading: false,
      errorMessage: 'Falha ao carregar',
      onRetry,
      onBack: vi.fn(),
    });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('Falha ao carregar');

    const retry = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'historico.errors.retry'));
    await act(async () => {
      (retry!.props as { onPress: () => void }).onPress();
    });
    expect(onRetry).toHaveBeenCalled();
  });
});
