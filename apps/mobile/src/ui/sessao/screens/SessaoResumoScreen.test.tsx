import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { SessaoResumoScreen } from './SessaoResumoScreen';

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
  StyleSheet: { create: (s: unknown) => s },
}));

vi.mock('../presenters/buildSessaoResumoViewModel', () => ({
  buildSessaoResumoViewModel: vi.fn(() => ({
    treinoNome: 'Treino A',
    duracao: '45min',
    exerciciosRealizados: 1,
    totalExercicios: 2,
    totalSeriesValidas: 6,
    volumeTotal: '1200 kg',
    exercicios: [
      { nome: 'Supino', realizado: true, totalSeriesValidas: 3, volume: '600 kg', melhorSerie: '80kg x8' },
      { nome: 'Agachamento', realizado: false, totalSeriesValidas: 0, volume: '0 kg', melhorSerie: null },
    ],
  })),
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

async function render(props: Parameters<typeof SessaoResumoScreen>[0]): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(createElement(SessaoResumoScreen, props));
  });
  return renderer;
}

describe('SessaoResumoScreen', () => {
  it('mostra o nome do treino e os exercícios, e chama onFechar', async () => {
    const onFechar = vi.fn();
    const renderer = await render({ detalhe: {} as never, onFechar });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('Treino A');
    expect(texts).toContain('Supino');
    expect(texts).toContain('Agachamento');

    const fechar = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'sessao.common.fechar'));
    await act(async () => {
      (fechar!.props as { onPress: () => void }).onPress();
    });
    expect(onFechar).toHaveBeenCalled();
  });
});
