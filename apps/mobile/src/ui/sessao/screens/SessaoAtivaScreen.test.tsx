import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import type { SessaoExercicioComSeries } from '../../../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import type { SessaoAtivaControllerState } from '../hooks/useSessaoAtivaController';

import { SessaoAtivaScreen } from './SessaoAtivaScreen';

/**
 * Smoke test de render: esta tela nunca era executada por teste (só typecheck
 * a protegia). Cobre o agrupamento (bi-set/circuito), a navegação para o
 * detalhe (solo e em grupo) e o pass-through de onRegistrarSegmento/onRemoverSegmento.
 */

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode),
);

vi.mock('expo-image', () => ({ Image: host('Image') }));

vi.mock('react-native', () => ({
  View: host('View'),
  Text: host('Text'),
  ScrollView: host('ScrollView'),
  Pressable: (props: Record<string, unknown>) =>
    createElement('Pressable', props, props.children as ReactNode),
  StyleSheet: { create: (s: unknown) => s },
}));

vi.mock('../../exercises/components/ExerciseMediaViewer', () => ({
  ExerciseMediaViewer: (props: Record<string, unknown>) => createElement('ExerciseMediaViewer', props),
}));
vi.mock('../../exercises/exerciseMetadataLabels', () => ({ metadataLabel: (_t: string, v: string) => v }));
vi.mock('../../shared/components/ConfirmDialog', () => ({
  ConfirmDialog: (props: Record<string, unknown>) => createElement('ConfirmDialog', props),
}));
vi.mock('../../shared/exerciseMedia', () => ({
  resolveThumbSource: () => null,
  resolveThumbSourceOrPlaceholder: () => ({ uri: 'placeholder' }),
}));
vi.mock('../components/AddExercicioSection', () => ({
  AddExercicioSection: (props: Record<string, unknown>) => createElement('AddExercicioSection', props),
}));
vi.mock('../components/ExercicioCard', () => ({
  ExercicioCard: (props: Record<string, unknown>) => createElement('ExercicioCard', props),
}));
vi.mock('../components/SubstituirExercicioModal', () => ({
  SubstituirExercicioModal: (props: Record<string, unknown>) => createElement('SubstituirExercicioModal', props),
}));
vi.mock('./BiSetDetalheScreen', () => ({
  BiSetDetalheScreen: (props: Record<string, unknown>) => createElement('BiSetDetalheScreen', props),
}));
vi.mock('./ExercicioDetalheScreen', () => ({
  ExercicioDetalheScreen: (props: Record<string, unknown>) => createElement('ExercicioDetalheScreen', props),
}));

vi.mock('../../shared/theme', async () => {
  const react = await import('react');
  const colors = new Proxy({}, { get: (_t, prop) => String(prop) });
  return { ThemeContext: react.createContext(colors), useTheme: () => colors };
});

vi.mock('../../shared/i18n', () => ({
  useT: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));

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

function exercicioItem(id: string, overrides: Record<string, unknown> = {}): SessaoExercicioComSeries {
  return {
    sessaoExercicio: {
      id, sessaoTreinoId: 's1', exercicioId: `ex-${id}`, ordem: 0, nomeSnapshot: `Exercicio ${id}`,
      grupoMuscularSnapshot: 'peito', categoriaSnapshot: 'composto', equipamentoSnapshot: null,
      musculoAlvoSnapshot: [], movementPatternSnapshot: null, realizado: false,
      seriesRecomendadas: 3, execucoesRecomendadas: 8, cargaPadrao: 40, tempoDescansoSegundos: 60,
      metodo: 'normal', grupoId: null, trackingTypeSnapshot: 'reps_load',
      duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null,
      substituidoPorExercicioId: null, substituicaoMotivo: null, nomeOriginalSnapshot: null,
      ...overrides,
    } as never,
    series: [],
    mediaOnline: null,
    mediaLocal: null,
  };
}

function baseState(overrides: Partial<SessaoAtivaControllerState> = {}): SessaoAtivaControllerState {
  return {
    detalhe: {
      sessao: { id: 's1', treinoId: 't1', treinoNomeSnapshot: 'Treino A', dataHoraInicio: '2026-05-21T10:00:00.000Z', dataHoraFim: null, status: 'em_andamento' } as never,
      exercicios: [exercicioItem('se1')],
    },
    sugestoes: {},
    availableExercises: [],
    showAddExercise: false,
    errorMessage: null,
    feedbackMessage: null,
    isFinalizing: false,
    isCanceling: false,
    temSerieValida: false,
    candidatosSubstituicao: [],
    sessaoExercicioSubstituindo: null,
    onRegistrarSerie: vi.fn().mockResolvedValue(undefined),
    onRegistrarSeriesEmLote: vi.fn().mockResolvedValue(undefined),
    onRegistrarSegmento: vi.fn().mockResolvedValue(undefined),
    onRemoverSegmento: vi.fn().mockResolvedValue(undefined),
    onDeleteSerie: vi.fn().mockResolvedValue(undefined),
    onDeleteSeries: vi.fn().mockResolvedValue(undefined),
    onUpdateSerie: vi.fn().mockResolvedValue(undefined),
    onToggleRealizado: vi.fn().mockResolvedValue(undefined),
    onToggleRealizadoGrupo: vi.fn().mockResolvedValue(undefined),
    onAddExercicio: vi.fn().mockResolvedValue(undefined),
    onToggleShowAddExercise: vi.fn(),
    onFinalizar: vi.fn().mockResolvedValue(undefined),
    onCancelar: vi.fn().mockResolvedValue(undefined),
    onAbrirSubstituicao: vi.fn().mockResolvedValue(undefined),
    onConfirmarSubstituicao: vi.fn().mockResolvedValue(undefined),
    onFecharSubstituicao: vi.fn(),
    onAtualizarMetodo: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('SessaoAtivaScreen', () => {
  it('shows the loading state when detalhe is null', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(SessaoAtivaScreen, baseState({ detalhe: null })));
    });
    expect(renderer.toJSON()).not.toBeNull();
  });

  it('renders solo exercicio cards and a bi-set group card', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(SessaoAtivaScreen, baseState({
          detalhe: {
            sessao: { id: 's1', treinoId: 't1', treinoNomeSnapshot: 'Treino A', dataHoraInicio: '2026-05-21T10:00:00.000Z', dataHoraFim: null, status: 'em_andamento' } as never,
            exercicios: [
              exercicioItem('se1'),
              exercicioItem('se2', { grupoId: 'g1', metodo: 'drop_set' }),
              exercicioItem('se3', { grupoId: 'g1', metodo: 'drop_set' }),
            ],
          },
        })),
      );
    });
    expect(renderer.root.findAllByType('ExercicioCard' as never)).toHaveLength(1);
    const grupoCard = renderer.root.findAll((n) => n.type === 'Pressable' && extractText(n.props.children).includes('Exercicio se2'));
    expect(grupoCard.length).toBeGreaterThan(0);
  });

  it('opens the solo exercicio detalhe and calls onRegistrarSegmento through the pass-through', async () => {
    const onRegistrarSegmento = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(SessaoAtivaScreen, baseState({ onRegistrarSegmento })));
    });
    const card = renderer.root.findByType('ExercicioCard' as never);
    await act(async () => { card.props.onPress(); });
    const detalhe = renderer.root.findByType('ExercicioDetalheScreen' as never);
    await act(async () => { await detalhe.props.onRegistrarSegmento({ serieId: 'sr1', cargaKg: 50, repeticoes: 6 }); });
    expect(onRegistrarSegmento).toHaveBeenCalledWith({ serieId: 'sr1', cargaKg: 50, repeticoes: 6 });
  });

  it('opens the bi-set detalhe and calls onRemoverSegmento through the pass-through', async () => {
    const onRemoverSegmento = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(SessaoAtivaScreen, baseState({
          onRemoverSegmento,
          detalhe: {
            sessao: { id: 's1', treinoId: 't1', treinoNomeSnapshot: 'Treino A', dataHoraInicio: '2026-05-21T10:00:00.000Z', dataHoraFim: null, status: 'em_andamento' } as never,
            exercicios: [
              exercicioItem('se1', { grupoId: 'g1', metodo: 'drop_set' }),
              exercicioItem('se2', { grupoId: 'g1', metodo: 'drop_set' }),
            ],
          },
        })),
      );
    });
    const grupoCard = renderer.root
      .findAll((n) => n.type === 'Pressable' && extractText(n.props.children).includes('Exercicio se1'))[0];
    await act(async () => { grupoCard.props.onPress(); });
    const detalhe = renderer.root.findByType('BiSetDetalheScreen' as never);
    await act(async () => { await detalhe.props.onRemoverSegmento('seg1'); });
    expect(onRemoverSegmento).toHaveBeenCalledWith('seg1');
  });

  it('toggles the add-exercicio section and fires onFinalizar', async () => {
    const onToggleShowAddExercise = vi.fn();
    const onFinalizar = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(SessaoAtivaScreen, baseState({ onToggleShowAddExercise, onFinalizar, temSerieValida: true })),
      );
    });
    await act(async () => { pressableWithText(renderer, 'sessao.ativa.adicionarExercicio')!.props.onPress(); });
    expect(onToggleShowAddExercise).toHaveBeenCalled();
    await act(async () => { await pressableWithText(renderer, 'sessao.ativa.finalizarSessaoBtn')!.props.onPress(); });
    expect(onFinalizar).toHaveBeenCalled();
  });

  it('confirms cancelar sessao via its confirm dialog', async () => {
    const onCancelar = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(SessaoAtivaScreen, baseState({ onCancelar })));
    });
    await act(async () => { pressableWithText(renderer, 'sessao.ativa.cancelarSessaoBtn')!.props.onPress(); });
    const cancelarDialog = renderer.root
      .findAllByType('ConfirmDialog' as never)
      .find((d) => d.props.title === 'sessao.ativa.cancelarSessaoBtn')!;
    await act(async () => { await cancelarDialog.props.onConfirm(); });
    expect(onCancelar).toHaveBeenCalled();
  });

  it('renders the AddExercicioSection when showAddExercise is true', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(SessaoAtivaScreen, baseState({ showAddExercise: true })));
    });
    expect(renderer.root.findAllByType('AddExercicioSection' as never)).toHaveLength(1);
  });

  it('shows an error message when present', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(SessaoAtivaScreen, baseState({ errorMessage: 'deu ruim' })));
    });
    const texts = renderer.root.findAllByType('Text' as never).map((t) => t.props.children);
    expect(texts.flat()).toContain('deu ruim');
  });
});
