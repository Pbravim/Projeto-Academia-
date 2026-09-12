import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { MetodoSelector } from './MetodoSelector';

/** Smoke test de render: garante que os chips existem e que onChange dispara. */

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode),
);

vi.mock('react-native', () => ({
  View: host('View'),
  Text: host('Text'),
  Pressable: (props: Record<string, unknown>) => {
    const style = typeof props.style === 'function' ? (props.style as (s: unknown) => unknown)({ pressed: false }) : props.style;
    return createElement('Pressable', { ...props, style, testID: props.testID }, props.children as ReactNode);
  },
  StyleSheet: { create: (s: unknown) => s },
}));

vi.mock('../../shared/theme', async () => {
  const react = await import('react');
  const colors = new Proxy({}, { get: (_t, prop) => String(prop) });
  return { ThemeContext: react.createContext(colors), useTheme: () => colors };
});

vi.mock('../../shared/i18n', () => ({ useT: () => (key: string) => key }));

describe('MetodoSelector', () => {
  it('renders normal + technique chips and fires onChange', async () => {
    const onChange = vi.fn();
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(MetodoSelector, { metodo: 'normal', onChange, locale: 'pt-BR' }),
      );
    });
    const pressables = renderer.root.findAllByType('Pressable' as never);
    expect(pressables.length).toBe(4); // normal + drop_set + piramide + rest_pause
    await act(async () => { pressables[1].props.onPress(); });
    expect(onChange).toHaveBeenCalledWith('drop_set');
  });

  it('shows the descricao when a non-normal metodo is selected', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(MetodoSelector, { metodo: 'drop_set', onChange: vi.fn(), locale: 'pt-BR' }),
      );
    });
    const texts = renderer.root.findAllByType('Text' as never).map((t) => t.props.children);
    expect(texts.flat().some((c) => typeof c === 'string' && c.length > 0)).toBe(true);
  });
});
