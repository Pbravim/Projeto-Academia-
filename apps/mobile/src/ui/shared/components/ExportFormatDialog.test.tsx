import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { ExportFormatDialog } from './ExportFormatDialog';

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

vi.mock('../theme', () => ({
  useTheme: () => new Proxy({}, { get: (_t, prop) => String(prop) }),
}));

vi.mock('../i18n', () => ({
  useT: () => (key: string) => key,
}));

async function render(props: Parameters<typeof ExportFormatDialog>[0]): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(createElement(ExportFormatDialog, props));
  });
  return renderer;
}

describe('ExportFormatDialog', () => {
  it('visible=false renders nothing', async () => {
    const renderer = await render({ visible: false, onSelect: vi.fn(), onClose: vi.fn() });
    expect(renderer.toJSON()).toBeNull();
  });

  it('visible=true renders the csv and json options', async () => {
    const renderer = await render({ visible: true, onSelect: vi.fn(), onClose: vi.fn() });
    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('dashboard.exportar.csv');
    expect(texts).toContain('dashboard.exportar.json');
  });

  it('selecting csv calls onSelect with csv', async () => {
    const onSelect = vi.fn();
    const renderer = await render({ visible: true, onSelect, onClose: vi.fn() });

    const csvOption = renderer.root.find((n) => n.props.accessibilityLabel === 'dashboard.exportar.csv');
    await act(async () => { csvOption.props.onPress(); });

    expect(onSelect).toHaveBeenCalledWith('csv');
  });

  it('cancel button calls onClose', async () => {
    const onClose = vi.fn();
    const renderer = await render({ visible: true, onSelect: vi.fn(), onClose });

    const cancelBtn = renderer.root.find((n) => n.props.accessibilityLabel === 'common.cancel');
    await act(async () => { cancelBtn.props.onPress(); });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
