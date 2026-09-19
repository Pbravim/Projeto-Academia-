import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { LanguagePickerModal } from './LanguagePickerModal';

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

vi.mock('../i18n/languages', () => ({
  SUPPORTED_LANGUAGES: [
    { code: 'pt-BR', endonym: 'Português', flag: '🇧🇷' },
    { code: 'en-US', endonym: 'English', flag: '🇺🇸' },
  ],
}));

vi.mock('../theme', async () => {
  const react = await import('react');
  const colors = new Proxy({}, { get: (_t, prop) => String(prop) });
  return {
    ThemeContext: react.createContext(colors),
    useTheme: () => colors,
  };
});

vi.mock('../i18n', () => ({
  useT: () => (key: string) => key,
}));

async function render(props: Parameters<typeof LanguagePickerModal>[0]): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(createElement(LanguagePickerModal, props));
  });
  return renderer;
}

describe('LanguagePickerModal', () => {
  it('fechado: não renderiza conteúdo', async () => {
    const renderer = await render({
      visible: false,
      activeLocale: 'pt-BR',
      onSelect: vi.fn(),
      onClose: vi.fn(),
    });

    expect(renderer.toJSON()).toBeNull();
  });

  it('aberto: lista os idiomas e chama onSelect ao escolher um', async () => {
    const onSelect = vi.fn();
    const renderer = await render({
      visible: true,
      activeLocale: 'pt-BR',
      onSelect,
      onClose: vi.fn(),
    });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('English');

    const row = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'English'));
    await act(async () => {
      (row!.props as { onPress: () => void }).onPress();
    });
    expect(onSelect).toHaveBeenCalledWith('en-US');
  });

  it('mostra o check no idioma ativo e chama onClose ao pressionar o backdrop e a área de arrastar', async () => {
    const onClose = vi.fn();
    const renderer = await render({
      visible: true,
      activeLocale: 'en-US',
      onSelect: vi.fn(),
      onClose,
    });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('✓');

    const pressables = renderer.root.findAllByType('Pressable');
    await act(async () => { (pressables[0].props as { onPress: () => void }).onPress(); });
    expect(onClose).toHaveBeenCalledTimes(1);

    await act(async () => { (pressables[1].props as { onPress: () => void }).onPress(); });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
