import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { BackupSyncSection } from './BackupSyncSection';

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
  ActivityIndicator: host('ActivityIndicator'),
  StyleSheet: { create: (s: unknown) => s },
}));

const useBackupSync = vi.hoisted(() => vi.fn());
vi.mock('../hooks/useBackupSync', () => ({ useBackupSync }));

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

async function render(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(createElement(BackupSyncSection, { backup: {} as never }));
  });
  return renderer;
}

describe('BackupSyncSection', () => {
  it('deslogado: mostra o formulário e alterna para o modo de criar conta', async () => {
    const register = vi.fn();
    useBackupSync.mockReturnValue({
      authenticated: false,
      email: null,
      busy: false,
      status: null,
      login: vi.fn(),
      register,
      logout: vi.fn(),
      syncNow: vi.fn(),
    });

    const renderer = await render();

    let texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('perfil.backup.semConta');

    const toggle = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'perfil.backup.semConta'));
    await act(async () => {
      (toggle!.props as { onPress: () => void }).onPress();
    });

    texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('perfil.backup.jaTemConta');
    expect(texts).toContain('perfil.backup.criarConta');
    expect(texts).not.toContain('perfil.backup.semConta');

    const inputs = renderer.root.findAllByType('TextInput');
    await act(async () => { (inputs[0].props as { onChangeText: (v: string) => void }).onChangeText('Fulano'); });
    await act(async () => { (inputs[1].props as { onChangeText: (v: string) => void }).onChangeText('a@b.com'); });
    await act(async () => { (inputs[2].props as { onChangeText: (v: string) => void }).onChangeText('senha123'); });

    const submit = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'perfil.backup.criarConta'));
    await act(async () => {
      (submit!.props as { onPress: () => void }).onPress();
    });
    expect(register).toHaveBeenCalledWith('a@b.com', 'senha123', 'Fulano');
  });

  it('autenticado: mostra o email conectado e chama syncNow', async () => {
    const syncNow = vi.fn();
    useBackupSync.mockReturnValue({
      authenticated: true,
      email: 'a@b.com',
      busy: false,
      status: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      syncNow,
    });

    const renderer = await render();

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('a@b.com');

    const sync = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'perfil.backup.sincronizarAgora'));
    await act(async () => {
      (sync!.props as { onPress: () => void }).onPress();
    });
    expect(syncNow).toHaveBeenCalled();
  });
});
