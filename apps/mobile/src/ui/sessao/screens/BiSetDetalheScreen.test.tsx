import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import type { SessaoExercicioComSeries } from '../../../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import type { SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';

import { BiSetDetalheScreen } from './BiSetDetalheScreen';

/** Smoke test de render: esta tela nunca era executada por teste (só typecheck a protegia). */

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
    grupoId: 'g1',
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

function item(overrides: Partial<SessaoExercicioPrimitives> = {}, series: SessaoExercicioComSeries['series'] = []): SessaoExercicioComSeries {
  return { sessaoExercicio: sessaoExercicio(overrides), series, mediaOnline: null, mediaLocal: null };
}

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    grupoItens: [item({ id: 'se1', nomeSnapshot: 'Supino' }), item({ id: 'se2', nomeSnapshot: 'Crucifixo' })],
    grupoColor: '#16a34a',
    sugestoes: {},
    isLastExercicio: false,
    onRegistrarSeriesEmLote: vi.fn().mockResolvedValue(undefined),
    onDeleteSeries: vi.fn().mockResolvedValue(undefined),
    onToggleRealizadoGrupo: vi.fn().mockResolvedValue(undefined),
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

describe('BiSetDetalheScreen', () => {
  it('renders the bi-set registration form', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(BiSetDetalheScreen, baseProps()));
    });
    expect(renderer.toJSON()).not.toBeNull();
  });

  it('registers series in batch for both exercises on submit', async () => {
    const onRegistrarSeriesEmLote = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(BiSetDetalheScreen, baseProps({ onRegistrarSeriesEmLote })));
    });
    const addBtn = renderer.root
      .findAllByType('Pressable' as never)
      .find((p) => (p.props.children as { props?: { children?: unknown } })?.props?.children === 'sessao.biset.registrarBtn');
    expect(addBtn).toBeDefined();
    await act(async () => { await addBtn!.props.onPress(); });
    expect(onRegistrarSeriesEmLote).toHaveBeenCalled();
    const inputs = onRegistrarSeriesEmLote.mock.calls[0][0];
    expect(inputs).toHaveLength(2);
  });

  it('shows the Degrau 2 prescrito form for an item with metodo drop_set', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(BiSetDetalheScreen, baseProps({
          grupoItens: [item({ id: 'se1', metodo: 'drop_set' }), item({ id: 'se2' })],
        })),
      );
    });
    const texts = renderer.root.findAllByType('Text' as never).map((t) => t.props.children);
    expect(texts.flat()).toContain('sessao.degrau.prescrito');
  });

  it('renders paired sets with a degraus stack and lets removing a degrau', async () => {
    const onRemoverSegmento = vi.fn();
    const seriePorItem = [{
      id: 'sr1', sessaoExercicioId: 'se1', tipoSerie: 'valida' as const, ordem: 1,
      cargaKg: 60, repeticoes: 8, observacao: null, duracaoSegundos: null, distanciaMetros: null, intensidade: null,
      segmentos: [{ id: 'seg1', serieId: 'sr1', ordem: 2, cargaKg: 50, repeticoes: 6, descansoSegundos: null }],
    }];
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(BiSetDetalheScreen, baseProps({
          grupoItens: [item({ id: 'se1' }, seriePorItem), item({ id: 'se2' }, [])],
          onRemoverSegmento,
        })),
      );
    });
    const removeDegrauBtn = renderer.root
      .findAllByType('Pressable' as never)
      .find((p) => p.props.accessibilityLabel === 'sessao.degrau.remover');
    expect(removeDegrauBtn).toBeDefined();
    await act(async () => { removeDegrauBtn!.props.onPress(); });
    expect(onRemoverSegmento).toHaveBeenCalledWith('seg1');
  });
});
