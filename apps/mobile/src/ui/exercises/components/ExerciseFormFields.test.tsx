import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { MultiChipPicker } from './ExerciseFormFields';

/**
 * Smoke test de render: este módulo (campos do formulário de exercício)
 * nunca era executado por teste. Cobre o `MultiChipPicker` — inclui a linha
 * tocada pelo lint (`removeCustom`, renomeação de parâmetro por no-shadow).
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
  ScrollView: host('ScrollView'),
  TextInput: host('TextInput'),
  StyleSheet: { create: (s: unknown) => s },
}));

vi.mock('expo-file-system', () => ({
  File: vi.fn(),
  Directory: vi.fn(),
  Paths: { document: 'file:///documents/' },
}));
vi.mock('expo-image', () => ({ Image: host('Image') }));
vi.mock('expo-image-picker', () => ({}));

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

describe('MultiChipPicker', () => {
  it('remove um item customizado chamando onChange sem ele', async () => {
    const onChange = vi.fn();
    const renderer = await render(
      createElement(MultiChipPicker, { value: 'Peito, CustomFoo', onChange }),
    );

    const trigger = renderer.root.findAllByType('Pressable')[0];
    await act(async () => {
      (trigger.props as { onPress: () => void }).onPress();
    });

    const removeBtn = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === '✕'));
    await act(async () => {
      (removeBtn!.props as { onPress: () => void }).onPress();
    });

    expect(onChange).toHaveBeenCalledWith('Peito');
  });
});
