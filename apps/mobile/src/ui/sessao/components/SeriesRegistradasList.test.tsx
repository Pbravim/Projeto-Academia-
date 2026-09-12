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
    expect(texts).toContain('60×8 → 50×6');
    const pressables = renderer.root.findAllByType('Pressable' as never);
    const removeDegrauBtn = pressables.find((p) => p.props.accessibilityLabel === 'sessao.degrau.remover');
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
  });
});
