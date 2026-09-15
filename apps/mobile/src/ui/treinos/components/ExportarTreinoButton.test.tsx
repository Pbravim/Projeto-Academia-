import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { ExportarTreinoButton } from './ExportarTreinoButton';

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode)
);

vi.mock('react-native', () => ({
  Pressable: host('Pressable'),
  Text: host('Text'),
  StyleSheet: { create: (s: unknown) => s },
}));

vi.mock('../../shared/i18n', () => ({ useT: () => (key: string) => key }));

vi.mock('../../shared/theme', async () => {
  const react = await import('react');
  const colors = new Proxy({}, { get: (_t, prop) => String(prop) });
  return { ThemeContext: react.createContext(colors), useTheme: () => colors };
});

async function render(el: ReturnType<typeof createElement>): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(el); });
  return renderer;
}

describe('ExportarTreinoButton', () => {
  it('mostra o rotulo padrao e chama onPress quando nao esta exportando', async () => {
    const onPress = vi.fn();
    const renderer = await render(createElement(ExportarTreinoButton, { isExporting: false, onPress }));

    const btn = renderer.root.findByType('Pressable');
    expect(btn.props.disabled).toBe(false);
    expect(renderer.root.findByType('Text').props.children).toBe('treinos.exportar.botao');

    await act(async () => { btn.props.onPress(); });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('mostra o rotulo de carregamento e desabilita o botao quando exportando', async () => {
    const renderer = await render(createElement(ExportarTreinoButton, { isExporting: true, onPress: vi.fn() }));

    const btn = renderer.root.findByType('Pressable');
    expect(btn.props.disabled).toBe(true);
    expect(renderer.root.findByType('Text').props.children).toBe('treinos.exportar.exportando');
  });
});
