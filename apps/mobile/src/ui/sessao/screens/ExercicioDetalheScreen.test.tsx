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

function extractText(node: unknown, seen = new Set<unknown>()): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map((n) => extractText(n, seen)).join('');
  if (typeof node === 'object') {
    if (seen.has(node)) return '';
    seen.add(node);
    const children = (node as { props?: { children?: unknown } }).props?.children;
    return extractText(children, seen);
  }
  return '';
}

function pressableWithText(renderer: ReactTestRenderer, text: string) {
  return renderer.root
    .findAll((node) => node.type === 'Pressable')
    .find((p) => extractText(p.props.children).includes(text));
}

function serie(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sr1', sessaoExercicioId: 'se1', tipoSerie: 'valida', ordem: 1,
    cargaKg: 60, repeticoes: 8, observacao: null,
    duracaoSegundos: null, distanciaMetros: null, intensidade: null,
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

  it('shows a validation error for invalid cardio duration and registers on valid input', async () => {
    const onRegistrarSerie = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(ExercicioDetalheScreen, baseProps({
          sessaoExercicio: sessaoExercicio({ trackingTypeSnapshot: 'cardio' }),
          onRegistrarSerie,
        })),
      );
    });
    const addBtn = pressableWithText(renderer, 'sessao.detalhe.registrarSerieBtn')!;
    await act(async () => { await addBtn.props.onPress(); });
    expect(onRegistrarSerie).not.toHaveBeenCalled();

    const inputs = renderer.root.findAllByType('TextInput' as never);
    await act(async () => { inputs[0].props.onChangeText('1'); });
    await act(async () => { inputs[1].props.onChangeText('30'); });
    await act(async () => { inputs[2].props.onChangeText('5'); });
    await act(async () => { inputs[3].props.onChangeText('100'); });
    await act(async () => { await addBtn.props.onPress(); });
    expect(onRegistrarSerie).toHaveBeenCalledWith(
      expect.objectContaining({ duracaoSegundos: 90, intensidade: 5, distanciaMetros: 100 }),
    );
  });

  it('registers a hold serie by duration in seconds', async () => {
    const onRegistrarSerie = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(ExercicioDetalheScreen, baseProps({
          sessaoExercicio: sessaoExercicio({ trackingTypeSnapshot: 'hold' }),
          onRegistrarSerie,
        })),
      );
    });
    const holdInput = renderer.root.findAllByType('TextInput' as never)[0];
    await act(async () => { holdInput.props.onChangeText('45'); });
    await act(async () => { await pressableWithText(renderer, 'sessao.detalhe.registrarSerieBtn')!.props.onPress(); });
    expect(onRegistrarSerie).toHaveBeenCalledWith(expect.objectContaining({ duracaoSegundos: 45 }));
  });

  it('registers a reps_only serie by rep count', async () => {
    const onRegistrarSerie = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(ExercicioDetalheScreen, baseProps({
          sessaoExercicio: sessaoExercicio({ trackingTypeSnapshot: 'reps_only' }),
          onRegistrarSerie,
        })),
      );
    });
    const repsInput = renderer.root.findAllByType('TextInput' as never)[0];
    await act(async () => { repsInput.props.onChangeText('12'); });
    await act(async () => { await pressableWithText(renderer, 'sessao.detalhe.registrarSerieBtn')!.props.onPress(); });
    expect(onRegistrarSerie).toHaveBeenCalledWith(expect.objectContaining({ repeticoes: 12 }));
  });

  it('shows the reps_load stats card (volume, max, bar chart) when realizado with series', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(ExercicioDetalheScreen, baseProps({
          sessaoExercicio: sessaoExercicio({ realizado: true }),
          series: [serie({ id: 'sr1', cargaKg: 60, repeticoes: 8 }), serie({ id: 'sr2', cargaKg: 70, repeticoes: 6 })],
        })),
      );
    });
    const texts = renderer.root.findAllByType('Text' as never).map((t) => t.props.children).flat();
    expect(texts).toContain('sessao.detalhe.volumePorSerie');
    expect(texts).toContain('sessao.detalhe.maxLabel');
  });

  it('shows the non-reps_load stats card when realizado with series', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(ExercicioDetalheScreen, baseProps({
          sessaoExercicio: sessaoExercicio({ realizado: true, trackingTypeSnapshot: 'reps_only' }),
          series: [serie({ id: 'sr1', cargaKg: null, repeticoes: 12 })],
        })),
      );
    });
    const texts = renderer.root.findAllByType('Text' as never).map((t) => t.props.children).flat();
    expect(texts).toContain('sessao.detalhe.realizado');
  });

  it('toggles the media viewer, picks a rest preset and opens the custom rest field', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(ExercicioDetalheScreen, baseProps()));
    });
    const mediaBtn = pressableWithText(renderer, 'sessao.detalhe.verExecucao')!;
    await act(async () => { mediaBtn.props.onPress(); });
    expect(pressableWithText(renderer, 'sessao.common.fechar')).toBeDefined();

    const off = pressableWithText(renderer, 'Off')!;
    await act(async () => { off.props.onPress(); });

    const customChip = pressableWithText(renderer, 'sessao.detalhe.descansoCustomChip')!;
    await act(async () => { customChip.props.onPress(); });
    const customInput = renderer.root
      .findAllByType('TextInput' as never)
      .find((i) => i.props.placeholder === 'sessao.detalhe.segundosPlaceholder')!;
    await act(async () => { customInput.props.onChangeText('50'); });
    const okBtn = pressableWithText(renderer, 'common.ok')!;
    await act(async () => { okBtn.props.onPress(); });
    expect(pressableWithText(renderer, '50s')).toBeDefined();
  });

  it('applies the sugestao chip to the carga text field', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(ExercicioDetalheScreen, baseProps({
          sugestao: { cargaSugerida: 45, motivo: 'progressao' },
        })),
      );
    });
    const sugestaoChip = pressableWithText(renderer, 'progressao')!;
    await act(async () => { sugestaoChip.props.onPress(); });
    const cargaInput = renderer.root.findAllByType('TextInput' as never)[0];
    expect(cargaInput.props.value).toBe('45');
  });

  it('fires onAbrirSubstituicao and onToggleRealizado from the header', async () => {
    const onAbrirSubstituicao = vi.fn().mockResolvedValue(undefined);
    const onToggleRealizado = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(ExercicioDetalheScreen, baseProps({ onAbrirSubstituicao, onToggleRealizado })),
      );
    });
    await act(async () => { await pressableWithText(renderer, 'sessao.common.trocarExercicio')!.props.onPress(); });
    expect(onAbrirSubstituicao).toHaveBeenCalledWith('se1');
    await act(async () => { await pressableWithText(renderer, 'sessao.common.finalizar')!.props.onPress(); });
    expect(onToggleRealizado).toHaveBeenCalledWith('se1');
  });

  it('navigates to the next exercise and to finalizar when it is the last one', async () => {
    const onProximoExercicio = vi.fn();
    const onFinalizarSessao = vi.fn();
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(ExercicioDetalheScreen, baseProps({ onProximoExercicio, onFinalizarSessao })),
      );
    });
    await act(async () => { pressableWithText(renderer, 'sessao.common.proximoExercicio')!.props.onPress(); });
    expect(onProximoExercicio).toHaveBeenCalled();

    let renderer2!: ReactTestRenderer;
    await act(async () => {
      renderer2 = TestRenderer.create(
        createElement(ExercicioDetalheScreen, baseProps({ isLastExercicio: true, onFinalizarSessao })),
      );
    });
    await act(async () => { pressableWithText(renderer2, 'sessao.common.finalizarSessao')!.props.onPress(); });
    expect(onFinalizarSessao).toHaveBeenCalled();
  });

  it('completes the exercise via the confirm dialog, auto-filling missing series', async () => {
    const onRegistrarSeriesEmLote = vi.fn().mockResolvedValue(undefined);
    const onToggleRealizado = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(ExercicioDetalheScreen, baseProps({
          sessaoExercicio: sessaoExercicio({ seriesRecomendadas: 2 }),
          series: [serie()],
          onRegistrarSeriesEmLote,
          onToggleRealizado,
        })),
      );
    });
    await act(async () => { pressableWithText(renderer, 'sessao.common.concluirExercicioBtn')!.props.onPress(); });
    const confirmDialog = renderer.root.findByType('ConfirmDialog' as never);
    await act(async () => { await confirmDialog.props.onConfirm(); });
    expect(onRegistrarSeriesEmLote).toHaveBeenCalledWith([expect.objectContaining({ sessaoExercicioId: 'se1' })]);
    expect(onToggleRealizado).toHaveBeenCalledWith('se1');
  });

  it('switches carga/reps between carousel and text mode and adjusts carga with the +/- buttons', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(ExercicioDetalheScreen, baseProps()));
    });
    await act(async () => { pressableWithText(renderer, 'sessao.common.digitar')!.props.onPress(); });
    const cargaInput = renderer.root.findAllByType('TextInput' as never)[0];
    expect(cargaInput).toBeDefined();
    await act(async () => { cargaInput.props.onChangeText('55'); });
    const plusBtn = pressableWithText(renderer, '+2.5')!;
    await act(async () => { plusBtn.props.onPress(); });
    await act(async () => { pressableWithText(renderer, 'sessao.common.rolar')!.props.onPress(); });

    const repsDigitar = pressableWithText(renderer, 'sessao.common.digitar')!;
    await act(async () => { repsDigitar.props.onPress(); });
  });

  it('shows a validation error for invalid reps_load carga/reps', async () => {
    const onRegistrarSerie = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(ExercicioDetalheScreen, baseProps({ onRegistrarSerie })));
    });
    await act(async () => { pressableWithText(renderer, 'sessao.common.digitar')!.props.onPress(); });
    const cargaInput = renderer.root.findAllByType('TextInput' as never)[0];
    await act(async () => { cargaInput.props.onChangeText('abc'); });
    await act(async () => { await pressableWithText(renderer, 'sessao.detalhe.registrarSerieBtn')!.props.onPress(); });
    expect(onRegistrarSerie).not.toHaveBeenCalled();
  });
});
