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

  it('chama onMoveUp/onMoveDown e onUpdateMetodo ao alternar técnica', async () => {
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    const onUpdateMetodo = vi.fn(async () => {});
    const renderer = await render({ ...baseProps, onMoveUp, onMoveDown, onUpdateMetodo });

    const up = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === '↑'));
    await act(async () => { (up!.props as { onPress: () => void }).onPress(); });
    expect(onMoveUp).toHaveBeenCalled();

    const down = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === '↓'));
    await act(async () => { (down!.props as { onPress: () => void }).onPress(); });
    expect(onMoveDown).toHaveBeenCalled();

    const dropSet = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'treinos.card.tecnica.dropSet'));
    await act(async () => { (dropSet!.props as { onPress: () => void }).onPress(); });
    expect(onUpdateMetodo).toHaveBeenCalledWith('drop_set');
  });

  it('editar reps chama onChangeRecs com os valores atuais', async () => {
    const onChangeRecs = vi.fn();
    const renderer = await render({ ...baseProps, onChangeRecs });

    const repsInput = renderer.root.findAllByType('TextInput')[1];
    await act(async () => { (repsInput.props as { onChangeText: (v: string) => void }).onChangeText('10'); });
    expect(onChangeRecs).toHaveBeenCalledWith('3', '10', '80', '90');
  });

  it('inGroup: mostra setas de grupo, esconde reorder e remove chama onRemoveAlternativa', async () => {
    const onMoveUpInGroup = vi.fn();
    const onSairDoGrupo = vi.fn(async () => {});
    const onVincular = vi.fn(async () => {});
    const onRemoveAlternativa = vi.fn();
    const renderer = await render({
      ...baseProps,
      inGroup: true,
      isFirstInGroup: false,
      isLastInGroup: false,
      onMoveUpInGroup,
      onMoveDownInGroup: vi.fn(),
      onSairDoGrupo,
      canVincular: true,
      onVincular,
      onRemoveAlternativa,
      alternativas: [{ id: 'alt-1', name: 'Crucifixo', groupMuscles: ['Peito'] } as never],
    });

    const upGroup = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === '↑'));
    await act(async () => { (upGroup!.props as { onPress: () => void }).onPress(); });
    expect(onMoveUpInGroup).toHaveBeenCalled();

    const sair = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'treinos.card.sairDoGrupo'));
    await act(async () => { (sair!.props as { onPress: () => void }).onPress(); });
    expect(onSairDoGrupo).toHaveBeenCalled();

    const vincular = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'treinos.card.vincularComProximo'));
    await act(async () => { (vincular!.props as { onPress: () => void }).onPress(); });
    expect(onVincular).toHaveBeenCalled();

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('Crucifixo');

    const removeButtons = renderer.root
      .findAllByType('Pressable')
      .filter((p) => p.findAllByType('Text').some((t) => t.props.children === '✕'));
    await act(async () => { (removeButtons[removeButtons.length - 1].props as { onPress: () => void }).onPress(); });
    expect(onRemoveAlternativa).toHaveBeenCalledWith('alt-1');
  });
});
