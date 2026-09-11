import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';

import { ExerciseCardRow, ExerciseSectionHeader } from './ExerciseSection';

/**
 * Smoke test de render: este módulo (cabeçalho de seção + card de exercício
 * da SectionList do catálogo) nunca era executado por teste.
 */

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode),
);

vi.mock('react-native', () => ({
  View: host('View'),
  Text: host('Text'),
  Pressable: host('Pressable'),
  StyleSheet: { create: (s: unknown) => s },
}));

vi.mock('expo-image', () => ({ Image: host('Image') }));

vi.mock('../../shared/exerciseMedia', () => ({
  resolveThumbSource: vi.fn(() => null),
  resolveThumbSourceOrPlaceholder: vi.fn(() => ({ uri: 'placeholder' })),
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

async function render(el: ReturnType<typeof createElement>): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(el);
  });
  return renderer;
}

const exercise = { id: 'ex-1', mediaLocal: null } as ExercisePrimitives;

const card: Parameters<typeof ExerciseCardRow>[0]['card'] = {
  id: 'ex-1',
  title: 'Supino',
  subtitle: 'Peito',
  meta: '3 séries',
  ultimoPeso: null,
  nameVariations: [],
};

describe('ExerciseSectionHeader', () => {
  it('mostra o grupo muscular e chama onToggle ao pressionar', async () => {
    const onToggle = vi.fn();
    const renderer = await render(
      createElement(ExerciseSectionHeader, { groupMuscle: 'Peito', count: 3, isOpen: false, onToggle }),
    );

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('Peito');

    const pressable = renderer.root.findByType('Pressable');
    await act(async () => {
      (pressable.props as { onPress: () => void }).onPress();
    });
    expect(onToggle).toHaveBeenCalledWith('Peito');
  });
});

describe('ExerciseCardRow', () => {
  it('mostra o título e chama onSelectEdit ao pressionar editar', async () => {
    const onSelectEdit = vi.fn();
    const renderer = await render(
      createElement(ExerciseCardRow, {
        card,
        isFirst: true,
        isLast: true,
        isEditing: false,
        isDeleting: false,
        anyDeleting: false,
        exercise,
        onSelectEdit,
        onViewHistorico: vi.fn(),
        onViewMedia: vi.fn(),
        onDelete: vi.fn(async () => {}),
      }),
    );

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('Supino');

    const editBtn = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'exercises.card.editar'));
    await act(async () => {
      (editBtn!.props as { onPress: () => void }).onPress();
    });
    expect(onSelectEdit).toHaveBeenCalledWith(exercise);
  });
});
