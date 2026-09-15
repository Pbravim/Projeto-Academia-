import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import type { TreinoDetailControllerState } from '../hooks/useTreinoDetailController';

import { TreinoDetailScreen } from './TreinoDetailScreen';

/**
 * Smoke test de render: cobre so o cabecalho novo desta fatia
 * (heroCardHeader + ExportarTreinoButton). O resto da tela (edicao de
 * exercicios, alternativas, plano) e regressao existente sem teste
 * dedicado; ver LEARNINGS "telas não têm teste — typecheck é a rede".
 */

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode)
);

vi.mock('react-native', () => ({
  BackHandler: { addEventListener: () => ({ remove: () => {} }) },
  KeyboardAvoidingView: host('KeyboardAvoidingView'),
  Modal: (props: Record<string, unknown>) => (props.visible ? createElement('View', {}, props.children as ReactNode) : null),
  Platform: { OS: 'ios' },
  Pressable: host('Pressable'),
  ScrollView: host('ScrollView'),
  Text: host('Text'),
  TextInput: host('TextInput'),
  View: host('View'),
  StyleSheet: { create: (s: unknown) => s },
}));

vi.mock('../../shared/i18n', () => ({
  useLocale: () => 'pt-BR',
  useT: () => (key: string) => key,
}));

vi.mock('../../shared/theme', async () => {
  const react = await import('react');
  const colors = new Proxy({}, { get: (_t, prop) => String(prop) });
  return { ThemeContext: react.createContext(colors), useTheme: () => colors };
});

vi.mock('../../exercises/components/ExerciseMediaViewer', () => ({ ExerciseMediaViewer: () => null }));
vi.mock('../../shared/components/ConfirmDialog', () => ({ ConfirmDialog: () => null }));
vi.mock('../components/ExercicioCardTreino', () => ({ ExercicioCardTreino: () => null }));
vi.mock('../components/ExercisePickerGroup', () => ({ ExercisePickerGroup: () => null }));
vi.mock('../components/SubstitutosPickerModal', () => ({ SubstitutosPickerModal: () => null }));
vi.mock('../components/ExportarTreinoButton', () => ({
  ExportarTreinoButton: (props: { isExporting: boolean; onPress: () => void }) =>
    createElement('Pressable', { testID: 'exportar-btn', disabled: props.isExporting, onPress: props.onPress },
      createElement('Text', {}, props.isExporting ? 'exportando' : 'exportar')),
}));

async function render(el: ReturnType<typeof createElement>): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(el); });
  return renderer;
}

function baseProps(overrides: Partial<TreinoDetailControllerState> = {}): TreinoDetailControllerState {
  return {
    treino: { id: 't1', name: 'Peito', objetivo: null, createdAt: 'x', updatedAt: 'x' },
    treinoExercicios: [],
    availableExercises: [],
    exercisesById: new Map(),
    errorMessage: null,
    feedbackMessage: null,
    isReordering: false,
    onAddExercicio: vi.fn(),
    onAddMultiplosExercicios: vi.fn(),
    onRemoveExercicio: vi.fn(),
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
    onMoveUpInGroup: vi.fn(),
    onMoveDownInGroup: vi.fn(),
    onUpdateRecomendacoes: vi.fn(),
    onUpdateMetodoGrupo: vi.fn(),
    onUpdateNome: vi.fn(),
    onUpdateObjetivo: vi.fn(),
    alternativasByExercicioId: new Map(),
    onAddAlternativa: vi.fn(),
    onRemoveAlternativa: vi.fn(),
    getSessaoAtiva: vi.fn().mockResolvedValue(null),
    cancelarSessao: vi.fn(),
    isExporting: false,
    onExportar: vi.fn(),
    onBack: vi.fn(),
    onGoToSessao: vi.fn(),
    ...overrides,
  };
}

describe('TreinoDetailScreen', () => {
  it('renderiza o botao de exportar no cabecalho e repassa isExporting/onExportar', async () => {
    const onExportar = vi.fn();
    const renderer = await render(createElement(TreinoDetailScreen, baseProps({ onExportar, isExporting: true })));

    const btn = renderer.root.find((n) => n.props.testID === 'exportar-btn');
    expect(btn.props.disabled).toBe(true);

    await act(async () => { btn.props.onPress(); });
    expect(onExportar).toHaveBeenCalledTimes(1);
  });
});
