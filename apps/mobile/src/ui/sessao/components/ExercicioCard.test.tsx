import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import type { SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';

import { ExercicioCard } from './ExercicioCard';

/** Smoke test de render: este componente nunca era executado por teste. */

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

vi.mock('../../exercises/components/ExerciseMediaViewer', () => ({
  ExerciseMediaViewer: host('ExerciseMediaViewer'),
}));

vi.mock('../../shared/components/ConfirmDialog', () => ({ ConfirmDialog: host('ConfirmDialog') }));

vi.mock('../../exercises/exerciseMetadataLabels', () => ({
  metadataLabel: (_kind: string, value: string) => value,
}));

vi.mock('../../shared/exerciseMedia', () => ({
  resolveThumbSource: vi.fn(() => null),
  resolveThumbSourceOrPlaceholder: vi.fn(() => ({ uri: 'placeholder' })),
}));

vi.mock('../../shared/metodoPresentation', () => ({
  METODO_CONFIG: {},
  metodoLabel: (m: string) => m,
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
  useLocale: () => 'pt-BR',
}));

async function render(props: Parameters<typeof ExercicioCard>[0]): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(createElement(ExercicioCard, props));
  });
  return renderer;
}

const sessaoExercicio = {
  realizado: false,
  seriesRecomendadas: 3,
  metodo: 'normal',
  grupoMuscularSnapshot: 'Peito',
  categoriaSnapshot: 'composto',
  nomeOriginalSnapshot: null,
  nomeSnapshot: 'Supino',
} as unknown as SessaoExercicioPrimitives;

describe('ExercicioCard', () => {
  it('mostra o nome e chama onPress ao pressionar o card', async () => {
    const onPress = vi.fn();
    const renderer = await render({
      sessaoExercicio,
      series: [],
      mediaLocal: null,
      mediaOnline: null,
      onPress,
    });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('Supino');

    const card = renderer.root.findAllByType('Pressable')[0];
    await act(async () => {
      (card.props as { onPress: () => void }).onPress();
    });
    expect(onPress).toHaveBeenCalled();
  });

  it('finalizado: mostra o badge de concluído', async () => {
    const renderer = await render({
      sessaoExercicio: { ...sessaoExercicio, realizado: true },
      series: [],
      mediaLocal: null,
      mediaOnline: null,
      onPress: vi.fn(),
    });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('✓');
  });

  it('com progresso e onToggleRealizado: mostra pontos, abre confirmação e chama onToggleRealizado', async () => {
    const onToggleRealizado = vi.fn();
    const renderer = await render({
      sessaoExercicio,
      series: [{ id: 's1' } as never],
      mediaLocal: null,
      mediaOnline: null,
      onPress: vi.fn(),
      onToggleRealizado,
    });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts.flat(Infinity).join('')).toContain('1/3');

    const checkBtn = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.props.accessibilityRole === 'checkbox')!;
    await act(async () => { (checkBtn.props as { onPress: () => void }).onPress(); });

    const dialog = renderer.root.findByType('ConfirmDialog');
    expect(dialog.props.visible).toBe(true);
    await act(async () => { (dialog.props as { onConfirm: () => void }).onConfirm(); });
    expect(onToggleRealizado).toHaveBeenCalled();
  });

  it('sem seriesRecomendadas e com substituição: mostra badge de substituição e mídia', async () => {
    const { resolveThumbSource } = await import('../../shared/exerciseMedia');
    vi.mocked(resolveThumbSource).mockReturnValue({ uri: 'gif' } as never);

    const renderer = await render({
      sessaoExercicio: {
        ...sessaoExercicio,
        seriesRecomendadas: null,
        nomeOriginalSnapshot: 'Supino Reto',
      },
      series: [{ id: 's1' } as never],
      mediaLocal: 'media.gif',
      mediaOnline: null,
      onPress: vi.fn(),
    });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts.join('')).toContain('Supino Reto');

    const mediaBtn = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.props.accessibilityLabel === 'sessao.a11y.verMidia')!;
    await act(async () => { (mediaBtn.props as { onPress: () => void }).onPress(); });
    expect(renderer.root.findByType('ExerciseMediaViewer').props.visible).toBe(true);

    vi.mocked(resolveThumbSource).mockReturnValue(null);
  });
});
