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
    onRegistrarSegmento: vi.fn().mockResolvedValue(true),
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

function serieFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sr1', sessaoExercicioId: 'se1', tipoSerie: 'valida' as const, ordem: 1,
    cargaKg: 60, repeticoes: 8, observacao: null,
    duracaoSegundos: null, distanciaMetros: null, intensidade: null,
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

  it('shows validation errors for invalid carga/reps per exercise', async () => {
    const onRegistrarSeriesEmLote = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(BiSetDetalheScreen, baseProps({ onRegistrarSeriesEmLote })));
    });
    await act(async () => { pressableWithText(renderer, 'sessao.common.digitar')!.props.onPress(); });
    const cargaInput = renderer.root.findAllByType('TextInput' as never)[0];
    await act(async () => { cargaInput.props.onChangeText('abc'); });
    await act(async () => { await pressableWithText(renderer, 'sessao.biset.registrarBtn')!.props.onPress(); });
    expect(onRegistrarSeriesEmLote).not.toHaveBeenCalled();
  });

  it('applies a sugestao chip to the exercise carga field', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(BiSetDetalheScreen, baseProps({
          sugestoes: { se1: { cargaSugerida: 45, motivo: 'progressao' } },
        })),
      );
    });
    const sugestaoChip = pressableWithText(renderer, 'progressao')!;
    await act(async () => { sugestaoChip.props.onPress(); });
    expect(renderer.root.findAllByType('TextInput' as never)[0].props.value).toBe('45');
  });

  it('selects a rest preset and fires onAbrirSubstituicao', async () => {
    const onAbrirSubstituicao = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(BiSetDetalheScreen, baseProps({ onAbrirSubstituicao })));
    });
    await act(async () => { pressableWithText(renderer, '45s')!.props.onPress(); });
    await act(async () => { await pressableWithText(renderer, 'sessao.common.trocarExercicio')!.props.onPress(); });
    expect(onAbrirSubstituicao).toHaveBeenCalledWith('se1');
  });

  it('toggles the whole group as realizado', async () => {
    const onToggleRealizadoGrupo = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(BiSetDetalheScreen, baseProps({ onToggleRealizadoGrupo })));
    });
    await act(async () => { pressableWithText(renderer, 'sessao.common.finalizar')!.props.onPress(); });
    expect(onToggleRealizadoGrupo).toHaveBeenCalledWith(['se1', 'se2']);
  });

  it('completes the group via the confirm dialog with auto-fill', async () => {
    const onRegistrarSeriesEmLote = vi.fn().mockResolvedValue(undefined);
    const onToggleRealizadoGrupo = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(BiSetDetalheScreen, baseProps({
          grupoItens: [item({ id: 'se1', seriesRecomendadas: 1 }, []), item({ id: 'se2', seriesRecomendadas: 1 }, [])],
          onRegistrarSeriesEmLote,
          onToggleRealizadoGrupo,
        })),
      );
    });
    await act(async () => { pressableWithText(renderer, 'sessao.common.concluirExercicioBtn')!.props.onPress(); });
    const confirmDialog = renderer.root.findByType('ConfirmDialog' as never);
    await act(async () => { await confirmDialog.props.onConfirm(); });
    expect(onRegistrarSeriesEmLote).toHaveBeenCalled();
    expect(onToggleRealizadoGrupo).toHaveBeenCalledWith(['se1', 'se2']);
  });

  it('navigates to the next exercise and to finalizar when it is the last one', async () => {
    const onProximoExercicio = vi.fn();
    const onFinalizarSessao = vi.fn();
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(BiSetDetalheScreen, baseProps({ onProximoExercicio, onFinalizarSessao })),
      );
    });
    await act(async () => { pressableWithText(renderer, 'sessao.common.proximoExercicio')!.props.onPress(); });
    expect(onProximoExercicio).toHaveBeenCalled();

    let renderer2!: ReactTestRenderer;
    await act(async () => {
      renderer2 = TestRenderer.create(
        createElement(BiSetDetalheScreen, baseProps({ isLastExercicio: true, onFinalizarSessao })),
      );
    });
    await act(async () => { pressableWithText(renderer2, 'sessao.common.finalizarSessao')!.props.onPress(); });
    expect(onFinalizarSessao).toHaveBeenCalled();
  });

  it('renders the "done" navigation card when the whole group is realizado', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(BiSetDetalheScreen, baseProps({
          grupoItens: [item({ id: 'se1', realizado: true }), item({ id: 'se2', realizado: true })],
        })),
      );
    });
    expect(renderer.toJSON()).not.toBeNull();
  });

  it('deletes a paired set by index', async () => {
    const onDeleteSeries = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(BiSetDetalheScreen, baseProps({
          grupoItens: [item({ id: 'se1' }, [serieFixture()]), item({ id: 'se2' }, [serieFixture({ id: 'sr2' })])],
          onDeleteSeries,
        })),
      );
    });
    const deleteBtn = renderer.root
      .findAllByType('Pressable' as never)
      .find((p) => extractText(p.props.children) === '✕' && !p.props.accessibilityLabel);
    expect(deleteBtn).toBeDefined();
    await act(async () => { await deleteBtn!.props.onPress(); });
    expect(onDeleteSeries).toHaveBeenCalledWith(['sr1', 'sr2']);
  });

  it('switches carga/reps between carousel and text mode and adjusts carga', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(BiSetDetalheScreen, baseProps()));
    });
    const digitarBtns = renderer.root.findAll((n) => n.type === 'Pressable' && extractText(n.props.children).includes('sessao.common.digitar'));
    await act(async () => { digitarBtns[0].props.onPress(); });
    const cargaInput = renderer.root.findAllByType('TextInput' as never)[0];
    await act(async () => { cargaInput.props.onChangeText('55'); });
    const plusBtn = pressableWithText(renderer, '+2.5')!;
    await act(async () => { plusBtn.props.onPress(); });
    const rolarBtn = renderer.root.findAll((n) => n.type === 'Pressable' && extractText(n.props.children).includes('sessao.common.rolar'))[0];
    await act(async () => { rolarBtn.props.onPress(); });

    const repsDigitar = renderer.root.findAll((n) => n.type === 'Pressable' && extractText(n.props.children).includes('sessao.common.digitar'))[0];
    await act(async () => { repsDigitar.props.onPress(); });
    const repsInput = renderer.root.findAllByType('TextInput' as never)[0];
    await act(async () => { repsInput.props.onChangeText('7'); });
    const repsRolar = renderer.root.findAll((n) => n.type === 'Pressable' && extractText(n.props.children).includes('sessao.common.rolar'))[0];
    await act(async () => { repsRolar.props.onPress(); });
  });

  it('submits the batch including a filled Degrau 2 for a drop_set item', async () => {
    const onRegistrarSeriesEmLote = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(BiSetDetalheScreen, baseProps({
          grupoItens: [item({ id: 'se1', metodo: 'drop_set' }), item({ id: 'se2' })],
          onRegistrarSeriesEmLote,
        })),
      );
    });
    const degrau2Inputs = renderer.root.findAllByType('TextInput' as never);
    // primeiros dois TextInput pertencem ao formulario do Degrau 2 do se1 (carga/reps)
    await act(async () => { degrau2Inputs[0].props.onChangeText('50'); });
    await act(async () => { degrau2Inputs[1].props.onChangeText('6'); });
    await act(async () => { await pressableWithText(renderer, 'sessao.biset.registrarBtn')!.props.onPress(); });
    expect(onRegistrarSeriesEmLote).toHaveBeenCalledWith([
      expect.objectContaining({ sessaoExercicioId: 'se1', segmentos: [{ cargaKg: 50, repeticoes: 6, descansoSegundos: undefined }] }),
      expect.objectContaining({ sessaoExercicioId: 'se2', segmentos: undefined }),
    ]);
  });

  it('blocks the batch when Degrau 2 is filled but invalid (achado #1)', async () => {
    const onRegistrarSeriesEmLote = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(BiSetDetalheScreen, baseProps({
          grupoItens: [item({ id: 'se1', metodo: 'drop_set' }), item({ id: 'se2' })],
          onRegistrarSeriesEmLote,
        })),
      );
    });
    const degrau2Inputs = renderer.root.findAllByType('TextInput' as never);
    // só a carga preenchida, reps continua com o valor pre-fill do template -> ainda deveria
    // ser válido; para invalidar de fato, zera reps também depois de preencher carga.
    await act(async () => { degrau2Inputs[0].props.onChangeText('50'); });
    await act(async () => { degrau2Inputs[1].props.onChangeText('0'); });
    await act(async () => { await pressableWithText(renderer, 'sessao.biset.registrarBtn')!.props.onPress(); });
    expect(onRegistrarSeriesEmLote).not.toHaveBeenCalled();
  });

  it('re-prefills Degrau 2 (carga vazia) after a successful batch (achado #8)', async () => {
    const onRegistrarSeriesEmLote = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(BiSetDetalheScreen, baseProps({
          grupoItens: [item({ id: 'se1', metodo: 'drop_set' }), item({ id: 'se2' })],
          onRegistrarSeriesEmLote,
        })),
      );
    });
    const degrau2Inputs = renderer.root.findAllByType('TextInput' as never);
    await act(async () => { degrau2Inputs[0].props.onChangeText('50'); });
    await act(async () => { degrau2Inputs[1].props.onChangeText('6'); });
    await act(async () => { await pressableWithText(renderer, 'sessao.biset.registrarBtn')!.props.onPress(); });
    expect(onRegistrarSeriesEmLote).toHaveBeenCalled();
    const cargaInputAfter = renderer.root.findAllByType('TextInput' as never)[0];
    expect(cargaInputAfter.props.value).toBe('');
  });

  it('opens and confirms the inline "+ degrau" for a paired set row, closing on success', async () => {
    const onRegistrarSegmento = vi.fn().mockResolvedValue(true);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(BiSetDetalheScreen, baseProps({
          grupoItens: [item({ id: 'se1' }, [serieFixture()]), item({ id: 'se2' }, [])],
          onRegistrarSegmento,
        })),
      );
    });
    const addDegrauBtn = renderer.root
      .findAllByType('Pressable' as never)
      .find((p) => p.props.accessibilityLabel === 'sessao.degrau.adicionar');
    expect(addDegrauBtn).toBeDefined();
    await act(async () => { addDegrauBtn!.props.onPress(); });
    const inputs = renderer.root.findAllByType('TextInput' as never);
    const [cargaInput, repsInput] = inputs.slice(-2);
    await act(async () => { cargaInput.props.onChangeText('50'); });
    await act(async () => { repsInput.props.onChangeText('6'); });
    const confirmBtn = pressableWithText(renderer, 'common.ok')!;
    await act(async () => { await confirmBtn.props.onPress(); });
    expect(onRegistrarSegmento).toHaveBeenCalledWith({ serieId: 'sr1', cargaKg: 50, repeticoes: 6, descansoSegundos: undefined });
    // form fechado: o "+ degrau" daquela linha volta a aparecer
    expect(
      renderer.root.findAllByType('Pressable' as never).find((p) => p.props.accessibilityLabel === 'sessao.degrau.adicionar'),
    ).toBeDefined();
  });

  it('keeps the inline "+ degrau" form open when onRegistrarSegmento fails (achado #12)', async () => {
    const onRegistrarSegmento = vi.fn().mockResolvedValue(false);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(BiSetDetalheScreen, baseProps({
          grupoItens: [item({ id: 'se1' }, [serieFixture()]), item({ id: 'se2' }, [])],
          onRegistrarSegmento,
        })),
      );
    });
    const addDegrauBtn = renderer.root
      .findAllByType('Pressable' as never)
      .find((p) => p.props.accessibilityLabel === 'sessao.degrau.adicionar')!;
    await act(async () => { addDegrauBtn.props.onPress(); });
    const inputs = renderer.root.findAllByType('TextInput' as never);
    const [cargaInput, repsInput] = inputs.slice(-2);
    await act(async () => { cargaInput.props.onChangeText('50'); });
    await act(async () => { repsInput.props.onChangeText('6'); });
    const confirmBtn = pressableWithText(renderer, 'common.ok')!;
    await act(async () => { await confirmBtn.props.onPress(); });
    const inputsAfter = renderer.root.findAllByType('TextInput' as never).slice(-2);
    expect(inputsAfter[0].props.value).toBe('50');
    expect(inputsAfter[1].props.value).toBe('6');
  });
});
