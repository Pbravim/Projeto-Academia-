import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { MediaFields } from './ExerciseFormFields';

/**
 * Cobre o fluxo de escolher mídia da galeria em `MediaFields`: desde o SDK 56
 * `File.copy()` do expo-file-system é assíncrono, e `onChangeLocal` só pode
 * receber o caminho de destino depois de a cópia concluir.
 */

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode),
);

const fs = vi.hoisted(() => {
  const copy = vi.fn();
  // Aceita string ou objeto com `uri` (o app passa `new File(dir, nome)`).
  const join = (segments: unknown[]) =>
    segments
      .map((s) => (typeof s === 'string' ? s : (s as { uri: string }).uri))
      .filter(Boolean)
      .join('/');
  return {
    copy,
    File: vi.fn(function (this: unknown, ...segments: unknown[]) {
      return { uri: join(segments), exists: false, delete: vi.fn(), copy };
    }),
    Directory: vi.fn(function (this: unknown, ...segments: unknown[]) {
      return { uri: join(segments), exists: true, create: vi.fn() };
    }),
  };
});

const picker = vi.hoisted(() => ({
  requestMediaLibraryPermissionsAsync: vi.fn(),
  launchImageLibraryAsync: vi.fn(),
  UIImagePickerControllerQualityType: { Medium: 1 },
}));

vi.mock('react-native', () => ({
  View: host('View'),
  Text: host('Text'),
  Pressable: host('Pressable'),
  Modal: host('Modal'),
  ScrollView: host('ScrollView'),
  TextInput: host('TextInput'),
  StyleSheet: { create: (s: unknown) => s },
}));

vi.mock('expo-file-system', () => ({
  File: fs.File,
  Directory: fs.Directory,
  Paths: { document: 'file:///documents/' },
}));
vi.mock('expo-image', () => ({ Image: host('Image') }));
vi.mock('expo-image-picker', () => picker);

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

function pickButton(renderer: ReactTestRenderer) {
  return renderer.root
    .findAllByType('Pressable')
    .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'exercises.media.selecionarGaleria'))!;
}

describe('MediaFields', () => {
  it('aguarda a cópia assíncrona do arquivo antes de publicar o caminho local', async () => {
    let copied = false;
    fs.copy.mockImplementation(async () => {
      await Promise.resolve();
      copied = true;
    });
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    picker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'content://gallery/video.MP4' }],
    });
    let copiedAoPublicar: boolean | null = null;
    const onChangeLocal = vi.fn((_value: string | null) => {
      copiedAoPublicar = copied;
    });

    const renderer = await render(
      createElement(MediaFields, {
        exercicioId: 'e1',
        mediaOnline: '',
        mediaLocal: null,
        onChangeOnline: vi.fn(),
        onChangeLocal,
      }),
    );

    await act(async () => {
      (pickButton(renderer).props as { onPress: () => void }).onPress();
    });

    expect(fs.copy).toHaveBeenCalledTimes(1);
    expect(copiedAoPublicar).toBe(true);
    expect(onChangeLocal).toHaveBeenCalledWith(expect.stringContaining('exercises/e1_local.mp4'));
  });

  it('abre o diálogo de permissão e não copia nada quando a galeria é negada', async () => {
    fs.copy.mockReset();
    picker.launchImageLibraryAsync.mockClear();
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false });
    const onChangeLocal = vi.fn();

    const renderer = await render(
      createElement(MediaFields, {
        exercicioId: null,
        mediaOnline: '',
        mediaLocal: null,
        onChangeOnline: vi.fn(),
        onChangeLocal,
      }),
    );

    await act(async () => {
      (pickButton(renderer).props as { onPress: () => void }).onPress();
    });

    expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
    expect(fs.copy).not.toHaveBeenCalled();
    expect(onChangeLocal).not.toHaveBeenCalled();
    const modal = renderer.root.findAllByType('Modal')[0];
    expect(modal?.props.visible).toBe(true);
  });
});
