import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog } from './ConfirmDialog';

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode),
);

vi.mock('react-native', () => ({
  Modal: host('Modal'),
  Pressable: host('Pressable'),
  Text: host('Text'),
  View: host('View'),
  StyleSheet: { create: (s: unknown) => s },
}));

// Sentinela: 0.42 nao coincide com nenhum opacity literal do componente
// (0.7/0.85 pre-existentes), entao um regresso a `{ opacity: 0.7 }` inline
// nao passaria por coincidencia (achado #3, review-1).
vi.mock('../theme', () => ({
  useTheme: () => new Proxy({ pressedOpacity: 0.42 }, { get: (t, prop) => (prop in t ? (t as never)[prop] : String(prop)) }),
}));

vi.mock('../i18n', () => ({
  useT: () => (key: string) => key,
}));

async function render(props: Parameters<typeof ConfirmDialog>[0]): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(createElement(ConfirmDialog, props));
  });
  return renderer;
}

describe('ConfirmDialog', () => {
  it('renders title, message and both buttons when visible', async () => {
    const renderer = await render({
      visible: true,
      title: 'Titulo',
      message: 'Mensagem',
      confirmLabel: 'Confirmar',
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('Titulo');
    expect(texts).toContain('Mensagem');
    expect(texts).toContain('Confirmar');
    expect(texts).toContain('common.back');
  });

  it('pressing cancel resolves the cancel button style to opacity: theme.pressedOpacity', async () => {
    const onCancel = vi.fn();
    const renderer = await render({
      visible: true,
      title: 'Titulo',
      message: 'Mensagem',
      confirmLabel: 'Confirmar',
      onConfirm: vi.fn(),
      onCancel,
    });

    const cancelBtn = renderer.root.find(
      (n) => typeof n.props.style === 'function' && n.props.children?.props?.children === 'common.back',
    );

    expect(cancelBtn.props.style({ pressed: true })).toEqual([
      expect.anything(),
      { opacity: 0.42 },
    ]);
    expect(cancelBtn.props.style({ pressed: false })).toEqual([expect.anything(), null]);

    await act(async () => { cancelBtn.props.onPress(); });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
