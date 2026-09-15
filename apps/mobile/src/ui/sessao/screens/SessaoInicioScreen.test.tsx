import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';

import { SessaoInicioScreen } from './SessaoInicioScreen';

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode),
);

vi.mock('react-native', () => ({
  View: host('View'),
  Text: host('Text'),
  ScrollView: host('ScrollView'),
  Pressable: (props: Record<string, unknown>) =>
    createElement('Pressable', props, props.children as ReactNode),
  StyleSheet: { create: (s: unknown) => s },
}));

vi.mock('../../shared/theme', async () => {
  const react = await import('react');
  const colors = new Proxy({}, { get: (_t, prop) => String(prop) });
  return { ThemeContext: react.createContext(colors), useTheme: () => colors };
});

vi.mock('../../shared/i18n', () => ({
  useT: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));

function extractText(node: unknown, seen = new Set<unknown>()): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map((n) => extractText(n, seen)).join('');
  if (typeof node === 'object') {
    if (seen.has(node)) return '';
    seen.add(node);
    const children = (node as { props?: { children?: unknown } }).props?.children;
    return extractText(children, seen);
  }
  return '';
}

function pressableWithText(renderer: ReactTestRenderer, text: string) {
  return renderer.root
    .findAll((node) => node.type === 'Pressable')
    .find((p) => extractText(p.props.children).includes(text));
}

const treinoA: TreinoPrimitives = {
  id: 't1',
  name: 'Treino A',
  objetivo: 'forca',
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
};

function baseProps(overrides: Partial<Parameters<typeof SessaoInicioScreen>[0]> = {}) {
  return {
    treinos: [treinoA],
    treinosComExercicios: new Set(['t1']),
    sugestao: null,
    errorMessage: null,
    isIniciando: false,
    onIniciar: vi.fn().mockResolvedValue(undefined),
    onIniciarLivre: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('SessaoInicioScreen', () => {
  it('renders the sessao livre card when there are treinos', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(SessaoInicioScreen, baseProps()));
    });
    expect(pressableWithText(renderer, 'sessao.inicio.comecarLivre')).toBeDefined();
  });

  it('renders the sessao livre card in the empty state (no treinos)', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(SessaoInicioScreen, baseProps({ treinos: [], treinosComExercicios: new Set() })),
      );
    });
    expect(pressableWithText(renderer, 'sessao.inicio.comecarLivre')).toBeDefined();
  });

  it('calls onIniciarLivre when the card button is pressed', async () => {
    const onIniciarLivre = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(SessaoInicioScreen, baseProps({ onIniciarLivre })));
    });
    const btn = pressableWithText(renderer, 'sessao.inicio.comecarLivre')!;
    await act(async () => {
      (btn.props as { onPress: () => void }).onPress();
    });
    expect(onIniciarLivre).toHaveBeenCalledTimes(1);
  });

  it('disables the sessao livre button while isIniciando', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(SessaoInicioScreen, baseProps({ isIniciando: true })));
    });
    const btn = pressableWithText(renderer, 'sessao.inicio.comecarLivre')!;
    expect(btn.props.disabled).toBe(true);
  });
});
