import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import type { TreinoListControllerState } from '../hooks/useTreinoListController';

import { TreinoListScreen } from './TreinoListScreen';

/**
 * Smoke test de render: cobre so o botao "Importar treino" (novo nesta
 * fatia) — o resto da tela (form, lista, modais) e regressao existente sem
 * teste dedicado; ver LEARNINGS "telas não têm teste — typecheck é a rede".
 */

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode)
);

vi.mock('react-native', () => ({
  ActivityIndicator: host('ActivityIndicator'),
  Modal: (props: Record<string, unknown>) => (props.visible ? createElement('View', {}, props.children as ReactNode) : null),
  Pressable: host('Pressable'),
  ScrollView: host('ScrollView'),
  Text: host('Text'),
  TextInput: host('TextInput'),
  View: host('View'),
  StyleSheet: { create: (s: unknown) => s },
}));

vi.mock('../../shared/components/ConfirmDialog', () => ({ ConfirmDialog: () => null }));
vi.mock('../components/PlanoPickerModal', () => ({ PlanoPickerModal: () => null }));
vi.mock('../components/PlanoSemanalCard', () => ({ PlanoSemanalCard: () => null }));

vi.mock('../../shared/i18n', () => ({
  useLocale: () => 'pt-BR',
  useT: () => (key: string) => key,
}));

vi.mock('../../shared/theme', async () => {
  const react = await import('react');
  const colors = new Proxy({}, { get: (_t, prop) => String(prop) });
  return { ThemeContext: react.createContext(colors), useTheme: () => colors };
});

async function render(el: ReturnType<typeof createElement>): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(el); });
  return renderer;
}

type ScreenProps = TreinoListControllerState & { plano: never; onImportar: () => void };

function baseProps(overrides: Partial<ScreenProps> = {}): ScreenProps {
  return {
    draft: { name: '', objetivo: '' },
    treinos: [],
    treinosVazios: new Set(),
    errorMessage: null,
    feedbackMessage: null,
    isLoading: false,
    isSubmitting: false,
    deletingId: null,
    duplicandoId: null,
    onChangeField: vi.fn(),
    onSubmit: vi.fn(),
    onDelete: vi.fn(),
    onDuplicate: vi.fn(),
    onSelectTreino: vi.fn(),
    reload: vi.fn(),
    plano: { plano: {}, isLoading: false, errorMessage: null, diaSelecionado: null, onSelectDia: vi.fn(), onSetTreino: vi.fn(), onClosePicker: vi.fn() } as never,
    onImportar: vi.fn(),
    ...overrides,
  };
}

describe('TreinoListScreen', () => {
  it('renderiza o botao "Importar treino" e chama onImportar ao tocar', async () => {
    const onImportar = vi.fn();
    const renderer = await render(createElement(TreinoListScreen, baseProps({ onImportar })));

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('treinos.list.importarTreino');

    const importarBtn = renderer.root
      .findAllByType('Pressable')
      .find((n) => n.findAllByType('Text').some((t) => t.props.children === 'treinos.list.importarTreino'))!;
    expect(importarBtn.props.style({ pressed: true })).toContainEqual({ opacity: 0.85 });
    expect(importarBtn.props.style({ pressed: false })).not.toContainEqual({ opacity: 0.85 });
    await act(async () => { importarBtn.props.onPress(); });

    expect(onImportar).toHaveBeenCalledTimes(1);
  });
});
