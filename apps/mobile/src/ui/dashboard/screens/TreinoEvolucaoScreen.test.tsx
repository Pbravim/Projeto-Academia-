import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { TreinoEvolucaoScreen } from './TreinoEvolucaoScreen';

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
  BackHandler: { addEventListener: vi.fn(() => ({ remove: vi.fn() })) },
}));

vi.mock('react-native-svg', () => ({
  default: host('Svg'),
  Circle: host('Circle'),
  Defs: host('Defs'),
  LinearGradient: host('LinearGradient'),
  Path: host('Path'),
  Stop: host('Stop'),
}));

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
  useLocale: () => 'pt-BR',
}));

async function render(props: Parameters<typeof TreinoEvolucaoScreen>[0]): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(createElement(TreinoEvolucaoScreen, props));
  });
  return renderer;
}

const exercicio: Parameters<typeof TreinoEvolucaoScreen>[0]['exercicios'][number] = {
  exercicioId: 'ex-1',
  exercicioNome: 'Supino',
  groupMuscle: 'Peito',
  sessoes: [
    { sessaoId: 's1', dataHoraInicio: '2026-01-05', melhorOrm: 90, series: [{ cargaKg: 80, repeticoes: 8 }] },
    { sessaoId: 's2', dataHoraInicio: '2026-01-01', melhorOrm: 85, series: [{ cargaKg: 75, repeticoes: 8 }] },
  ],
};

describe('TreinoEvolucaoScreen', () => {
  it('lista os exercícios e volta ao pressionar o botão de voltar', async () => {
    const onBack = vi.fn();
    const renderer = await render({
      treinoNome: 'Treino A',
      exercicios: [exercicio],
      isLoading: false,
      errorMessage: null,
      onBack,
    });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('Supino');

    const back = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'common.backArrow'));
    await act(async () => {
      (back!.props as { onPress: () => void }).onPress();
    });
    expect(onBack).toHaveBeenCalled();
  });

  it('vazio: mostra o texto de estado vazio', async () => {
    const renderer = await render({
      treinoNome: 'Treino A',
      exercicios: [],
      isLoading: false,
      errorMessage: null,
      onBack: vi.fn(),
    });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('dashboard.evolucao.emptyText');
  });
});
