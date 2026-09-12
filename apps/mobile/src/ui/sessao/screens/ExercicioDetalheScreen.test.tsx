import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import type { SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';

import { ExercicioDetalheScreen } from './ExercicioDetalheScreen';

/**
 * Smoke test de render: esta tela nunca era executada por teste (só typecheck
 * a protegia — ver LEARNINGS). Cobre o caminho feliz de registrar uma série
 * reps_load e a abertura do "Degrau 2" quando o método é drop_set.
 */

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode),
);

vi.mock('react-native', () => ({
  View: host('View'),
  Text: host('Text'),
  TextInput: host('TextInput'),
  ScrollView: host('ScrollView'),
  KeyboardAvoidingView: host('KeyboardAvoidingView'),
  Pressable: (props: Record<string, unknown>) =>
    createElement('Pressable', props, props.children as ReactNode),
  StyleSheet: { create: (s: unknown) => s },
  Platform: { OS: 'ios' },
}));

vi.mock('../components/PickerCarousel', () => ({
  PickerCarousel: (props: Record<string, unknown>) => createElement('PickerCarousel', props),
}));
vi.mock('../components/RestTimerBanner', () => ({
  RestTimerBanner: (props: Record<string, unknown>) => createElement('RestTimerBanner', props),
}));
vi.mock('../../exercises/components/ExerciseMediaViewer', () => ({
  ExerciseMediaViewer: (props: Record<string, unknown>) => createElement('ExerciseMediaViewer', props),
}));
vi.mock('../../shared/components/ConfirmDialog', () => ({
  ConfirmDialog: (props: Record<string, unknown>) => createElement('ConfirmDialog', props),
}));
vi.mock('../../shared/hooks/useAndroidBack', () => ({ useAndroidBack: vi.fn() }));

vi.mock('../../shared/theme', async () => {
  const react = await import('react');
  const colors = new Proxy({}, { get: (_t, prop) => String(prop) });
  return { ThemeContext: react.createContext(colors), useTheme: () => colors };
});

vi.mock('../../shared/i18n', () => ({
  useT: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));

function sessaoExercicio(overrides: Partial<SessaoExercicioPrimitives> = {}): SessaoExercicioPrimitives {
  return {
    id: 'se1',
    sessaoTreinoId: 's1',
    exercicioId: 'ex1',
    ordem: 0,
    nomeSnapshot: 'Supino',
    grupoMuscularSnapshot: 'peito',
    categoriaSnapshot: 'composto',
    equipamentoSnapshot: 'barra',
    musculoAlvoSnapshot: [],
    movementPatternSnapshot: null,
    realizado: false,
    seriesRecomendadas: 3,
    execucoesRecomendadas: 8,
    cargaPadrao: 40,
    tempoDescansoSegundos: 60,
    metodo: 'normal',
    grupoId: null,
    trackingTypeSnapshot: 'reps_load',
    duracaoRecomendadaSegundos: null,
    distanciaRecomendadaMetros: null,
    intensidadeRecomendada: null,
    substituidoPorExercicioId: null,
    substituicaoMotivo: null,
    nomeOriginalSnapshot: null,
    ...overrides,
  };
}

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    sessaoExercicio: sessaoExercicio(),
    series: [],
    sugestao: null,
    isLastExercicio: false,
    mediaOnline: null,
    mediaLocal: null,
    onRegistrarSerie: vi.fn().mockResolvedValue(undefined),
    onRegistrarSeriesEmLote: vi.fn().mockResolvedValue(undefined),
    onDeleteSerie: vi.fn().mockResolvedValue(undefined),
    onUpdateSerie: vi.fn().mockResolvedValue(undefined),
    onToggleRealizado: vi.fn().mockResolvedValue(undefined),
    onAbrirSubstituicao: vi.fn().mockResolvedValue(undefined),
    onAtualizarMetodo: vi.fn().mockResolvedValue(undefined),
    onRegistrarSegmento: vi.fn().mockResolvedValue(undefined),
    onRemoverSegmento: vi.fn().mockResolvedValue(undefined),
    onProximoExercicio: vi.fn(),
    onFinalizarSessao: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  };
}

describe('ExercicioDetalheScreen', () => {
  it('renders the registration form for an active reps_load exercise', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(ExercicioDetalheScreen, baseProps()));
    });
    expect(renderer.toJSON()).not.toBeNull();
  });

  it('registers a serie with the carousel values on "Registrar série"', async () => {
    const onRegistrarSerie = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(ExercicioDetalheScreen, baseProps({ onRegistrarSerie })));
    });
    const addBtn = renderer.root
      .findAllByType('Pressable' as never)
      .find((p) => (p.props.children as { props?: { children?: unknown } })?.props?.children === 'sessao.detalhe.registrarSerieBtn');
    expect(addBtn).toBeDefined();
    await act(async () => { await addBtn!.props.onPress(); });
    expect(onRegistrarSerie).toHaveBeenCalledWith(
      expect.objectContaining({ sessaoExercicioId: 'se1', segmentos: undefined }),
    );
  });

  it('shows the Degrau 2 prescrito form when metodo is drop_set', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(ExercicioDetalheScreen, baseProps({ sessaoExercicio: sessaoExercicio({ metodo: 'drop_set' }) })),
      );
    });
    const texts = renderer.root.findAllByType('Text' as never).map((t) => t.props.children);
    expect(texts.flat()).toContain('sessao.degrau.prescrito');
  });

  it('renders the "done" navigation card when realizado', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(ExercicioDetalheScreen, baseProps({ sessaoExercicio: sessaoExercicio({ realizado: true }) })),
      );
    });
    expect(renderer.toJSON()).not.toBeNull();
  });
});
