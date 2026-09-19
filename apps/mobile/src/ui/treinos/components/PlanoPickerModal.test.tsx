import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';

import { PlanoPickerModal } from './PlanoPickerModal';

/** Smoke test de render: este componente nunca era executado por teste. */

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode),
);

vi.mock('react-native', () => ({
  View: host('View'),
  Text: host('Text'),
  Pressable: host('Pressable'),
  Modal: host('Modal'),
  ScrollView: host('ScrollView'),
  Animated: {
    View: host('AnimatedView'),
    Value: class { setValue = vi.fn(); },
    timing: vi.fn(() => ({ start: (cb?: () => void) => cb?.() })),
    spring: vi.fn(() => ({ start: (cb?: () => void) => cb?.() })),
  },
  PanResponder: { create: () => ({ panHandlers: {} }) },
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

async function render(props: Parameters<typeof PlanoPickerModal>[0]): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(createElement(PlanoPickerModal, props));
  });
  return renderer;
}

const treino = { id: 't1', name: 'Treino A', objetivo: null } as TreinoPrimitives;

describe('PlanoPickerModal', () => {
  it('fechado (dia null): não renderiza conteúdo', async () => {
    const renderer = await render({
      dia: null,
      treinos: [],
      treinosVazios: new Set(),
      treinoAtualId: null,
      onSelect: vi.fn(async () => {}),
      onClose: vi.fn(),
    });

    expect(renderer.toJSON()).toBeNull();
  });

  it('aberto: lista os treinos e chama onSelect ao escolher um', async () => {
    const onSelect = vi.fn(async () => {});
    const renderer = await render({
      dia: 'seg',
      treinos: [treino],
      treinosVazios: new Set(),
      treinoAtualId: null,
      onSelect,
      onClose: vi.fn(),
    });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('Treino A');

    const row = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'Treino A'));
    await act(async () => {
      (row!.props as { onPress: () => void }).onPress();
    });
    expect(onSelect).toHaveBeenCalledWith('t1');
  });

  it('descanso: chama onSelect(null) e mostra o check quando já ativo', async () => {
    const onSelect = vi.fn(async () => {});
    const renderer = await render({
      dia: 'ter',
      treinos: [treino],
      treinosVazios: new Set(),
      treinoAtualId: null,
      onSelect,
      onClose: vi.fn(),
    });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('✓');

    const descanso = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'treinos.plano.descanso'));
    await act(async () => {
      (descanso!.props as { onPress: () => void }).onPress();
    });
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('treino vazio: não chama onSelect ao pressionar e mostra a dica', async () => {
    const onSelect = vi.fn(async () => {});
    const renderer = await render({
      dia: 'qua',
      treinos: [treino],
      treinosVazios: new Set(['t1']),
      treinoAtualId: null,
      onSelect,
      onClose: vi.fn(),
    });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('treinos.plano.adicioneExerciciosPrimeiro');

    const row = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'Treino A'));
    await act(async () => {
      (row!.props as { onPress: () => void }).onPress();
    });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('backdrop e drag area chamam onClose', async () => {
    const onClose = vi.fn();
    const renderer = await render({
      dia: 'qui',
      treinos: [],
      treinosVazios: new Set(),
      treinoAtualId: null,
      onSelect: vi.fn(async () => {}),
      onClose,
    });

    const pressables = renderer.root.findAllByType('Pressable');
    await act(async () => {
      (pressables[0].props as { onPress: () => void }).onPress();
    });
    expect(onClose).toHaveBeenCalled();
  });
});
