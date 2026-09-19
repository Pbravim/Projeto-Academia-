import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';

import { SubstitutosPickerModal } from './SubstitutosPickerModal';

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
  TextInput: host('TextInput'),
  StyleSheet: { create: (s: unknown) => s },
}));

vi.mock('expo-image', () => ({ Image: host('Image') }));

vi.mock('../../shared/exerciseMedia', () => ({
  resolveThumbSource: vi.fn(() => null),
  resolveThumbSourceOrPlaceholder: vi.fn(() => ({ uri: 'placeholder' })),
  resolveFullMediaSource: vi.fn(() => null),
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

async function render(props: Parameters<typeof SubstitutosPickerModal>[0]): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(createElement(SubstitutosPickerModal, props));
  });
  return renderer;
}

const exercicio = { id: 'ex-2', name: 'Crucifixo', groupMuscles: ['Peito'], category: 'isolado' } as ExercisePrimitives;

describe('SubstitutosPickerModal', () => {
  it('lista os grupos musculares e chama onAdd ao expandir e escolher um exercício', async () => {
    const onAdd = vi.fn(async () => {});
    const renderer = await render({
      visible: true,
      excludeExercicioId: 'ex-1',
      currentAlternativaIds: new Set(),
      allExercises: [exercicio],
      onAdd,
      onClose: vi.fn(),
    });

    const groupHeader = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'Peito'));
    await act(async () => {
      (groupHeader!.props as { onPress: () => void }).onPress();
    });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('Crucifixo');

    const item = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'Crucifixo'));
    await act(async () => {
      (item!.props as { onPress: () => void }).onPress();
    });
    expect(onAdd).toHaveBeenCalledWith('ex-2');
  });
});
