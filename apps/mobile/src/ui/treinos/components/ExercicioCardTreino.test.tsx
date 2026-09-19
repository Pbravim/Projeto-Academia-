import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { ExercicioCardTreino } from './ExercicioCardTreino';

/** Smoke test de render: este componente nunca era executado por teste. */

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode),
);

vi.mock('react-native', () => ({
  View: host('View'),
  Text: host('Text'),
  Pressable: host('Pressable'),
  TextInput: host('TextInput'),
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

async function render(props: Parameters<typeof ExercicioCardTreino>[0]): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(createElement(ExercicioCardTreino, props));
  });
  return renderer;
}

const baseProps: Parameters<typeof ExercicioCardTreino>[0] = {
  item: {
    treinoExercicioId: 'te-1',
    exercicioId: 'ex-1',
    name: 'Supino',
    groupMuscle: 'Peito',
    category: 'composto',
    ordem: 1,
    isFirst: true,
    isLast: true,
    metodo: 'normal',
    grupoId: null,
  },
  seriesRecomendadas: 3,
  execucoesRecomendadas: 8,
  cargaPadrao: 80,
  tempoDescansoSegundos: 90,
  alternativas: [],
  canVincular: false,
  onMoveUp: vi.fn(),
  onMoveDown: vi.fn(),
  onDesvincular: vi.fn(),
  onChangeRecs: vi.fn(),
  onUpdateMetodo: vi.fn(async () => {}),
  onVincular: vi.fn(async () => {}),
  onSairDoGrupo: null,
  onOpenSubstitutoPicker: vi.fn(),
  onRemoveAlternativa: vi.fn(),
  onViewMedia: vi.fn(),
};

describe('ExercicioCardTreino', () => {
  it('mostra o nome e chama onDesvincular ao pressionar remover', async () => {
    const onDesvincular = vi.fn();
    const renderer = await render({ ...baseProps, onDesvincular });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('Supino');

    const remove = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === '✕'));
    await act(async () => {
      (remove!.props as { onPress: () => void }).onPress();
    });
    expect(onDesvincular).toHaveBeenCalled();
  });

  it('chama onOpenSubstitutoPicker ao pressionar +', async () => {
    const onOpenSubstitutoPicker = vi.fn();
    const renderer = await render({ ...baseProps, onOpenSubstitutoPicker });

    const add = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === '+'));
    await act(async () => {
      (add!.props as { onPress: () => void }).onPress();
    });
    expect(onOpenSubstitutoPicker).toHaveBeenCalled();
  });
});
