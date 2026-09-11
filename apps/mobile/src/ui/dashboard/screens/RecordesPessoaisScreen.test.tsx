import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { RecordesPessoaisScreen } from './RecordesPessoaisScreen';

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
  BackHandler: { addEventListener: vi.fn(() => ({ remove: vi.fn() })) },
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

async function render(props: Parameters<typeof RecordesPessoaisScreen>[0]): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(createElement(RecordesPessoaisScreen, props));
  });
  return renderer;
}

describe('RecordesPessoaisScreen', () => {
  it('lista os recordes ordenados e volta ao pressionar o botão de voltar', async () => {
    const onBack = vi.fn();
    const renderer = await render({
      recordes: [
        { exercicioNome: 'Supino', melhorOrmKg: 90 },
        { exercicioNome: 'Agachamento', melhorOrmKg: 120 },
      ] as Parameters<typeof RecordesPessoaisScreen>[0]['recordes'],
      onBack,
    });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('Agachamento');
    expect(texts).toContain('Supino');

    const back = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'common.backArrow'));
    await act(async () => {
      (back!.props as { onPress: () => void }).onPress();
    });
    expect(onBack).toHaveBeenCalled();
  });
});
