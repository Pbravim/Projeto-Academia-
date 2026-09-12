import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import type { SerieComSegmentos } from '../../../application/sessoes/use-cases/GetSessaoDetalheUseCase';

import { SeriesRegistradasList } from './SeriesRegistradasList';

/** Smoke test de render: lista de séries, pilha de degraus e o botão "+ degrau". */

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode),
);

vi.mock('react-native', () => ({
  View: host('View'),
  Text: host('Text'),
  TextInput: host('TextInput'),
  Pressable: (props: Record<string, unknown>) =>
    createElement('Pressable', props, props.children as ReactNode),
  StyleSheet: { create: (s: unknown) => s },
}));

vi.mock('./PickerCarousel', () => ({
  PickerCarousel: (props: Record<string, unknown>) => createElement('PickerCarousel', props),
}));

vi.mock('../../shared/theme', async () => {
  const react = await import('react');
  const colors = new Proxy({}, { get: (_t, prop) => String(prop) });
  return { ThemeContext: react.createContext(colors), useTheme: () => colors };
});

vi.mock('../../shared/i18n', () => ({ useT: () => (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key) }));

const serie = (overrides: Partial<SerieComSegmentos> = {}): SerieComSegmentos => ({
  id: 'sr1',
  sessaoExercicioId: 'se1',
  tipoSerie: 'valida',
  ordem: 1,
  cargaKg: 60,
  repeticoes: 8,
  observacao: null,
  duracaoSegundos: null,
  distanciaMetros: null,
  intensidade: null,
  ...overrides,
});

describe('SeriesRegistradasList', () => {
  it('renders nothing when there are no series', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(SeriesRegistradasList, {
          series: [],
          trackingType: 'reps_load',
          realizado: false,
          bestSerieId: null,
          locale: 'pt-BR',
          onDeleteSerie: vi.fn(),
          onUpdateSerie: vi.fn(),
          onRegistrarSegmento: vi.fn(),
          onRemoverSegmento: vi.fn(),
        }),
      );
    });
    expect(renderer.toJSON()).toBeNull();
  });

  it('renders a série row with its degraus stack and remove buttons', async () => {
    const onRemoverSegmento = vi.fn();
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(SeriesRegistradasList, {
          series: [serie({ segmentos: [{ id: 'seg1', serieId: 'sr1', ordem: 2, cargaKg: 50, repeticoes: 6, descansoSegundos: null }] })],
          trackingType: 'reps_load',
          realizado: false,
          bestSerieId: null,
          locale: 'pt-BR',
          onDeleteSerie: vi.fn(),
          onUpdateSerie: vi.fn(),
          onRegistrarSegmento: vi.fn(),
          onRemoverSegmento,
        }),
      );
    });
    const texts = renderer.root.findAllByType('Text' as never).map((t) => t.props.children).flat();
    // achado #5: cada degrau é um chip próprio "50×6" (não mais a pilha "60×8 → 50×6" concatenada)
    expect(texts).toContain('50×6');
    const pressables = renderer.root.findAllByType('Pressable' as never);
    const removeDegrauBtn = pressables.find(
      (p) => typeof p.props.accessibilityLabel === 'string' && p.props.accessibilityLabel.startsWith('sessao.degrau.removerN'),
    );
    expect(removeDegrauBtn).toBeDefined();
    await act(async () => { removeDegrauBtn!.props.onPress(); });
    expect(onRemoverSegmento).toHaveBeenCalledWith('seg1');
  });

  it('shows "+ degrau" for reps_load active series and opens the inline form', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(SeriesRegistradasList, {
          series: [serie()],
          trackingType: 'reps_load',
          realizado: false,
          bestSerieId: null,
          locale: 'pt-BR',
          onDeleteSerie: vi.fn(),
          onUpdateSerie: vi.fn(),
          onRegistrarSegmento: vi.fn(),
          onRemoverSegmento: vi.fn(),
        }),
      );
    });
    const addBtn = renderer.root
      .findAllByType('Pressable' as never)
      .find((p) => p.props.accessibilityLabel === 'sessao.degrau.adicionar');
    expect(addBtn).toBeDefined();
    await act(async () => { addBtn!.props.onPress(); });
    expect(renderer.root.findAllByType('TextInput' as never).length).toBeGreaterThan(0);
  });

  it('hides "+ degrau" once the exercise is realizado', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(SeriesRegistradasList, {
          series: [serie()],
          trackingType: 'reps_load',
          realizado: true,
          bestSerieId: null,
          locale: 'pt-BR',
          onDeleteSerie: vi.fn(),
          onUpdateSerie: vi.fn(),
          onRegistrarSegmento: vi.fn(),
          onRemoverSegmento: vi.fn(),
        }),
      );
    });
    const addBtn = renderer.root
      .findAllByType('Pressable' as never)
      .find((p) => p.props.accessibilityLabel === 'sessao.degrau.adicionar');
    expect(addBtn).toBeUndefined();
  });

  it('opens the inline editor on long-press and saves via onUpdateSerie', async () => {
    const onUpdateSerie = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(SeriesRegistradasList, {
          series: [serie()],
          trackingType: 'reps_load',
          realizado: false,
          bestSerieId: null,
          locale: 'pt-BR',
          onDeleteSerie: vi.fn(),
          onUpdateSerie,
          onRegistrarSegmento: vi.fn(),
          onRemoverSegmento: vi.fn(),
        }),
      );
    });
    const metricPressable = renderer.root.findAllByType('Pressable' as never)[0];
    await act(async () => { metricPressable.props.onLongPress(); });
    const texts = renderer.root.findAllByType('Text' as never).map((t) => t.props.children);
    expect(texts.flat()).toContain('sessao.detalhe.editandoSerie');

    await act(async () => { renderer.root.findAllByType('PickerCarousel' as never)[0].props.onChangeIndex(10); });
    const saveBtn = renderer.root
      .findAllByType('Pressable' as never)
      .find((p) => String((p.props.children as { props?: { children?: unknown } })?.props?.children) === 'common.save')!;
    await act(async () => { await saveBtn.props.onPress(); });
    expect(onUpdateSerie).toHaveBeenCalledWith(expect.objectContaining({ serieId: 'sr1' }));

    // reabre e cancela
    await act(async () => { renderer.root.findAllByType('Pressable' as never)[0].props.onLongPress(); });
    const cancelBtn = renderer.root
      .findAllByType('Pressable' as never)
      .find((p) => String((p.props.children as { props?: { children?: unknown } })?.props?.children) === 'common.cancel')!;
    await act(async () => { cancelBtn.props.onPress(); });
  });

  it('opens the inline editor in text mode for an off-grid carga', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(SeriesRegistradasList, {
          series: [serie({ cargaKg: 61 })],
          trackingType: 'reps_load',
          realizado: false,
          bestSerieId: null,
          locale: 'pt-BR',
          onDeleteSerie: vi.fn(),
          onUpdateSerie: vi.fn(),
          onRegistrarSegmento: vi.fn(),
          onRemoverSegmento: vi.fn(),
        }),
      );
    });
    const metricPressable = renderer.root.findAllByType('Pressable' as never)[0];
    await act(async () => { metricPressable.props.onLongPress(); });
    const editInput = renderer.root.findAllByType('TextInput' as never)[0];
    await act(async () => { editInput.props.onChangeText('61.5'); });
    expect(editInput.props.value).toBe('61.5');
  });

  it('confirms an inline "+ degrau", calls onRegistrarSegmento and closes the form on success', async () => {
    const onRegistrarSegmento = vi.fn().mockResolvedValue(true);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(SeriesRegistradasList, {
          series: [serie()],
          trackingType: 'reps_load',
          realizado: false,
          bestSerieId: null,
          locale: 'pt-BR',
          onDeleteSerie: vi.fn(),
          onUpdateSerie: vi.fn(),
          onRegistrarSegmento,
          onRemoverSegmento: vi.fn(),
        }),
      );
    });
    const addBtn = renderer.root
      .findAllByType('Pressable' as never)
      .find((p) => p.props.accessibilityLabel === 'sessao.degrau.adicionar')!;
    await act(async () => { addBtn.props.onPress(); });
    const inputs = renderer.root.findAllByType('TextInput' as never);
    await act(async () => { inputs[0].props.onChangeText('50'); });
    await act(async () => { inputs[1].props.onChangeText('6'); });
    const confirmBtn = renderer.root
      .findAllByType('Pressable' as never)
      .find((p) => String((p.props.children as { props?: { children?: unknown } })?.props?.children) === 'common.ok')!;
    await act(async () => { await confirmBtn.props.onPress(); });
    expect(onRegistrarSegmento).toHaveBeenCalledWith({ serieId: 'sr1', cargaKg: 50, repeticoes: 6, descansoSegundos: undefined });
    // form fechado: volta a mostrar o botão "+ degrau" em vez dos inputs
    expect(renderer.root.findAllByType('TextInput' as never)).toHaveLength(0);
    expect(
      renderer.root.findAllByType('Pressable' as never).find((p) => p.props.accessibilityLabel === 'sessao.degrau.adicionar'),
    ).toBeDefined();
  });

  it('shows an error and does not call onRegistrarSegmento for reps-only input in "+ degrau" (achado #1, r2)', async () => {
    const onRegistrarSegmento = vi.fn().mockResolvedValue(true);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(SeriesRegistradasList, {
          series: [serie()],
          trackingType: 'reps_load',
          realizado: false,
          bestSerieId: null,
          locale: 'pt-BR',
          onDeleteSerie: vi.fn(),
          onUpdateSerie: vi.fn(),
          onRegistrarSegmento,
          onRemoverSegmento: vi.fn(),
        }),
      );
    });
    const addBtn = renderer.root
      .findAllByType('Pressable' as never)
      .find((p) => p.props.accessibilityLabel === 'sessao.degrau.adicionar')!;
    await act(async () => { addBtn.props.onPress(); });
    const inputs = renderer.root.findAllByType('TextInput' as never);
    await act(async () => { inputs[1].props.onChangeText('6'); }); // só reps; carga fica vazia
    const confirmBtn = renderer.root
      .findAllByType('Pressable' as never)
      .find((p) => String((p.props.children as { props?: { children?: unknown } })?.props?.children) === 'common.ok')!;
    await act(async () => { await confirmBtn.props.onPress(); });
    expect(onRegistrarSegmento).not.toHaveBeenCalled();
    const texts = renderer.root.findAllByType('Text' as never).map((t) => t.props.children).flat();
    expect(texts).toContain('Carga e repetições do degrau inválidas');
  });

  it('keeps the inline "+ degrau" form open (does not lose input) when onRegistrarSegmento fails (achado #12)', async () => {
    const onRegistrarSegmento = vi.fn().mockResolvedValue(false);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(SeriesRegistradasList, {
          series: [serie()],
          trackingType: 'reps_load',
          realizado: false,
          bestSerieId: null,
          locale: 'pt-BR',
          onDeleteSerie: vi.fn(),
          onUpdateSerie: vi.fn(),
          onRegistrarSegmento,
          onRemoverSegmento: vi.fn(),
        }),
      );
    });
    const addBtn = renderer.root
      .findAllByType('Pressable' as never)
      .find((p) => p.props.accessibilityLabel === 'sessao.degrau.adicionar')!;
    await act(async () => { addBtn.props.onPress(); });
    const inputs = renderer.root.findAllByType('TextInput' as never);
    await act(async () => { inputs[0].props.onChangeText('50'); });
    await act(async () => { inputs[1].props.onChangeText('6'); });
    const confirmBtn = renderer.root
      .findAllByType('Pressable' as never)
      .find((p) => String((p.props.children as { props?: { children?: unknown } })?.props?.children) === 'common.ok')!;
    await act(async () => { await confirmBtn.props.onPress(); });
    const inputsAfter = renderer.root.findAllByType('TextInput' as never);
    expect(inputsAfter[0].props.value).toBe('50');
    expect(inputsAfter[1].props.value).toBe('6');
  });

  it('deletes a série via its ✕, disabling the button while the promise is pending (achado #6)', async () => {
    let resolveDelete!: () => void;
    const onDeleteSerie = vi.fn(() => new Promise<void>((resolve) => { resolveDelete = resolve; }));
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(SeriesRegistradasList, {
          series: [serie()],
          trackingType: 'reps_load',
          realizado: false,
          bestSerieId: null,
          locale: 'pt-BR',
          onDeleteSerie,
          onUpdateSerie: vi.fn(),
          onRegistrarSegmento: vi.fn(),
          onRemoverSegmento: vi.fn(),
        }),
      );
    });
    const findDeleteBtn = () =>
      renderer.root
        .findAllByType('Pressable' as never)
        .find((p) => typeof p.props.accessibilityLabel === 'string' && p.props.accessibilityLabel.startsWith('sessao.a11y.removerSerie'))!;

    act(() => { findDeleteBtn().props.onPress(); });
    expect(onDeleteSerie).toHaveBeenCalledWith('sr1');
    expect(findDeleteBtn().props.disabled).toBe(true);

    await act(async () => { resolveDelete(); });
    expect(findDeleteBtn().props.disabled).toBe(false);
  });
});
