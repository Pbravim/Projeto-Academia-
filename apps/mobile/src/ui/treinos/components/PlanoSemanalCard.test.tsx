import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { diaSemanaHoje } from '../../../domain/plano/entities/DiaSemana';
import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';

import { PlanoSemanalCard } from './PlanoSemanalCard';

/** Smoke test de render: este componente nunca era executado por teste. */

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

async function render(props: Parameters<typeof PlanoSemanalCard>[0]): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(createElement(PlanoSemanalCard, props));
  });
  return renderer;
}

const treino = { id: 't1', name: 'Treino A' } as TreinoPrimitives;

describe('PlanoSemanalCard', () => {
  it('mostra o treino do dia de hoje e chama onSelectDia ao pressionar', async () => {
    const onSelectDia = vi.fn();
    const hoje = diaSemanaHoje();
    const renderer = await render({
      plano: { [hoje]: 't1' } as never,
      treinos: [treino],
      isLoading: false,
      onSelectDia,
    });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('Treino A');

    const cell = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'Treino A'));
    await act(async () => {
      (cell!.props as { onPress: () => void }).onPress();
    });
    expect(onSelectDia).toHaveBeenCalledWith(hoje);
  });
});
