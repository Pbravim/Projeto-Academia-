import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { ExerciseMediaViewer } from './ExerciseMediaViewer';

/**
 * Smoke test de render: este viewer nunca era executado por teste. Cobre o
 * ramo de vídeo local (`VideoPlayer` + `videoStyles.mediaBox`, tocado pelo
 * lint ao mover o estilo inline pra `StyleSheet.create`).
 */

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode),
);

vi.mock('react-native', () => ({
  View: host('View'),
  Text: host('Text'),
  Pressable: host('Pressable'),
  Modal: host('Modal'),
  StyleSheet: { create: (s: unknown) => s },
  Linking: { openURL: vi.fn(async () => {}) },
}));

vi.mock('expo-image', () => ({ Image: host('Image') }));
vi.mock('expo-video', () => ({
  useVideoPlayer: vi.fn(() => ({})),
  VideoView: host('VideoView'),
}));
vi.mock('expo-file-system', () => ({
  File: vi.fn(function FileMock() {
    return { exists: true };
  }),
}));
vi.mock('./gifAssets', () => ({ gifAssets: {} }));

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

async function render(props: Parameters<typeof ExerciseMediaViewer>[0]): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(createElement(ExerciseMediaViewer, props));
  });
  return renderer;
}

describe('ExerciseMediaViewer', () => {
  it('vídeo local: renderiza o VideoPlayer e fecha ao pressionar o X', async () => {
    const onClose = vi.fn();
    const renderer = await render({
      visible: true,
      exercicioNome: 'Supino',
      mediaOnline: null,
      mediaLocal: 'file:///media/video.mp4',
      onClose,
    });

    expect(renderer.root.findAllByType('VideoView')).toHaveLength(1);

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('Supino');

    const closeBtn = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === '✕'));
    await act(async () => {
      (closeBtn!.props as { onPress: () => void }).onPress();
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('invisível: não renderiza nada', async () => {
    const renderer = await render({
      visible: false,
      exercicioNome: 'Supino',
      mediaOnline: null,
      mediaLocal: null,
      onClose: vi.fn(),
    });

    expect(renderer.root.findAllByType('Modal')).toHaveLength(0);
  });
});
