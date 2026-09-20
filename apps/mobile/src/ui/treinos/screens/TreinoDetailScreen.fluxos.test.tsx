import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import type { TreinoExercicioPrimitives } from '../../../domain/treinos/entities/TreinoExercicio';
import { translate } from '../../shared/i18n/core';
import type { TreinoDetailControllerState } from '../hooks/useTreinoDetailController';

import { TreinoDetailScreen } from './TreinoDetailScreen';

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode)
);

const backState = vi.hoisted(() => ({ cb: null as null | (() => boolean) }));

vi.mock('react-native', () => ({
  BackHandler: {
    addEventListener: (_event: string, cb: () => boolean) => {
      backState.cb = cb;
      return { remove: vi.fn() };
    },
  },
  KeyboardAvoidingView: host('KeyboardAvoidingView'),
  Modal: (props: Record<string, unknown>) => (props.visible ? createElement('View', {}, props.children as ReactNode) : null),
  Platform: { OS: 'ios' },
  Pressable: (props: Record<string, unknown>) => createElement('Pressable', props, props.children as ReactNode),
  ScrollView: host('ScrollView'),
  Text: host('Text'),
  TextInput: (props: Record<string, unknown>) => createElement('TextInput', props),
  View: host('View'),
  StyleSheet: { create: (s: unknown) => s },
}));

vi.mock('../../shared/i18n', () => ({
  useLocale: () => 'pt-BR',
  useT: () => (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key),
}));

vi.mock('../../shared/theme', async () => {
  const react = await import('react');
  const colors = new Proxy({}, { get: (_t, prop) => String(prop) });
  return { ThemeContext: react.createContext(colors), useTheme: () => colors };
});

vi.mock('../../exercises/components/ExerciseMediaViewer', () => ({
  ExerciseMediaViewer: (props: Record<string, unknown>) => createElement('View', { testID: 'media', ...props }),
}));

vi.mock('../../shared/components/ConfirmDialog', () => ({
  ConfirmDialog: (props: Record<string, unknown>) => createElement('View', { testID: 'confirm', ...props }),
}));

vi.mock('../components/ExercicioCardTreino', () => ({
  ExercicioCardTreino: (props: { item: { treinoExercicioId: string } }) =>
    createElement('View', { testID: `card-${props.item.treinoExercicioId}`, ...props }),
}));

vi.mock('../components/ExercisePickerGroup', () => ({
  ExercisePickerGroup: (props: { group: string }) =>
    createElement('View', { testID: `picker-${props.group}`, ...props }),
}));

vi.mock('../components/SubstitutosPickerModal', () => ({
  SubstitutosPickerModal: (props: Record<string, unknown>) => createElement('View', { testID: 'substitutos', ...props }),
}));

vi.mock('../components/ExportarTreinoButton', () => ({
  ExportarTreinoButton: (props: { isExporting: boolean; onPress: () => void }) =>
    createElement(
      'Pressable',
      { testID: 'exportar-btn', disabled: props.isExporting, onPress: props.onPress },
      createElement('Text', {}, props.isExporting ? 'exportando' : 'exportar')
    ),
}));

async function render(el: ReturnType<typeof createElement>): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(el); });
  return renderer;
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

function texts(renderer: ReactTestRenderer): string[] {
  return renderer.root.findAllByType('Text' as never).map((n) => extractText(n.props.children));
}

function hasText(renderer: ReactTestRenderer, substr: string): boolean {
  return texts(renderer).some((t) => t.includes(substr));
}

function pressableWithText(renderer: ReactTestRenderer, text: string) {
  return renderer.root
    .findAll((node) => node.type === 'Pressable')
    .find((p) => extractText(p.props.children).includes(text));
}

function byTestID(renderer: ReactTestRenderer, testID: string) {
  const found = renderer.root.findAll((n) => n.props.testID === testID);
  return found[0];
}

function textInputs(renderer: ReactTestRenderer) {
  return renderer.root.findAll((n) => n.type === 'TextInput');
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function ex(id: string, name: string, groups: string[] = ['Peito'], extras: Partial<ExercisePrimitives> = {}): ExercisePrimitives {
  return {
    id,
    name,
    normalizedName: name.toLowerCase(),
    groupMuscles: groups,
    category: 'Categoria',
    equipment: null,
    loadUnit: 'kg',
    isCustom: false,
    createdAt: 'x',
    updatedAt: 'x',
    mediaOnline: null,
    mediaLocal: null,
    musculoAlvo: [],
    movementPattern: null,
    stabilizers: [],
    executionType: null,
    nameVariations: [],
    primaryEquipment: null,
    secondaryEquipment: null,
    catalogVersion: 1,
    trackingType: 'reps_load',
    ...extras,
  };
}

function te(id: string, exercicioId: string, ordem: number, extras: Partial<TreinoExercicioPrimitives> = {}): TreinoExercicioPrimitives {
  return {
    id,
    treinoId: 't1',
    exercicioId,
    ordem,
    seriesRecomendadas: null,
    execucoesRecomendadas: null,
    cargaPadrao: null,
    tempoDescansoSegundos: null,
    metodo: 'normal',
    grupoId: null,
    duracaoRecomendadaSegundos: null,
    distanciaRecomendadaMetros: null,
    intensidadeRecomendada: null,
    ...extras,
  };
}

function threeSingles(): { exercisesById: Map<string, ExercisePrimitives>; treinoExercicios: TreinoExercicioPrimitives[] } {
  const exercisesById = new Map([
    ['e1', ex('e1', 'Supino')],
    ['e2', ex('e2', 'Remada')],
    ['e3', ex('e3', 'Agachamento')],
  ]);
  const treinoExercicios = [te('t1', 'e1', 1), te('t2', 'e2', 2), te('t3', 'e3', 3)];
  return { exercisesById, treinoExercicios };
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

describe('TreinoDetailScreen — fluxos', () => {
  describe('renderiza grupos e exercícios', () => {
    it('renderiza 1 card single e 1 bloco biSet com 2 cards inGroup', async () => {
      const exercisesById = new Map([
        ['e1', ex('e1', 'Supino', ['Peito'])],
        ['e2', ex('e2', 'Remada', ['Costas'])],
        ['e3', ex('e3', 'Agachamento', ['Quadriceps'])],
      ]);
      const treinoExercicios = [
        te('t1', 'e1', 1, { grupoId: 'g1' }),
        te('t2', 'e2', 2, { grupoId: 'g1' }),
        te('t3', 'e3', 3),
      ];
      const renderer = await render(createElement(TreinoDetailScreen, baseProps({ treinoExercicios, exercisesById })));

      expect(byTestID(renderer, 'card-t1')).toBeDefined();
      expect(byTestID(renderer, 'card-t2')).toBeDefined();
      expect(byTestID(renderer, 'card-t3')).toBeDefined();
      expect(byTestID(renderer, 'card-t1').props.inGroup).toBe(true);
      expect(byTestID(renderer, 'card-t3').props.inGroup).toBeUndefined();
      expect(hasText(renderer, 'treinos.detail.grupoLabel.biSet')).toBe(true);
    });

    it('bloco com 3 exercícios mostra o label triSet', async () => {
      const exercisesById = new Map([
        ['e1', ex('e1', 'Supino')], ['e2', ex('e2', 'Remada')], ['e3', ex('e3', 'Agachamento')],
      ]);
      const treinoExercicios = [
        te('t1', 'e1', 1, { grupoId: 'g1' }),
        te('t2', 'e2', 2, { grupoId: 'g1' }),
        te('t3', 'e3', 3, { grupoId: 'g1' }),
      ];
      const renderer = await render(createElement(TreinoDetailScreen, baseProps({ treinoExercicios, exercisesById })));
      expect(hasText(renderer, 'treinos.detail.grupoLabel.triSet')).toBe(true);
    });

    it('bloco com 4 exercícios mostra o label circuito', async () => {
      const exercisesById = new Map([
        ['e1', ex('e1', 'a')], ['e2', ex('e2', 'b')], ['e3', ex('e3', 'c')], ['e4', ex('e4', 'd')],
      ]);
      const treinoExercicios = [
        te('t1', 'e1', 1, { grupoId: 'g1' }),
        te('t2', 'e2', 2, { grupoId: 'g1' }),
        te('t3', 'e3', 3, { grupoId: 'g1' }),
        te('t4', 'e4', 4, { grupoId: 'g1' }),
      ];
      const renderer = await render(createElement(TreinoDetailScreen, baseProps({ treinoExercicios, exercisesById })));
      expect(hasText(renderer, 'treinos.detail.grupoLabel.circuito')).toBe(true);
    });
  });

  it('estado vazio mostra a mensagem do presenter e não mostra o botão Salvar', async () => {
    const renderer = await render(createElement(TreinoDetailScreen, baseProps({ treinoExercicios: [] })));
    expect(hasText(renderer, translate('pt-BR', 'treinos.detail.emptyStateMessage'))).toBe(true);
    expect(hasText(renderer, 'treinos.detail.salvarTreino')).toBe(false);
  });

  it('mostra errorMessage e feedbackMessage quando presentes', async () => {
    const renderer = await render(
      createElement(TreinoDetailScreen, baseProps({ errorMessage: 'Erro X', feedbackMessage: 'Feedback Y' }))
    );
    expect(hasText(renderer, 'Erro X')).toBe(true);
    expect(hasText(renderer, 'Feedback Y')).toBe(true);
  });

  it('editar nome via Header real chama onUpdateNome com o valor aparado', async () => {
    const onUpdateNome = vi.fn().mockResolvedValue(undefined);
    const renderer = await render(createElement(TreinoDetailScreen, baseProps({ onUpdateNome })));

    const editBtn = pressableWithText(renderer, '✎')!;
    await act(async () => { editBtn.props.onPress(); });

    const nomeInput = textInputs(renderer).find((n) => n.props.value === 'Peito')!;
    await act(async () => { nomeInput.props.onChangeText('  Peito B  '); });

    const saveBtn = pressableWithText(renderer, 'common.save')!;
    await act(async () => { saveBtn.props.onPress(); });
    await flush();

    expect(onUpdateNome).toHaveBeenCalledWith('Peito B');
  });

  describe('objetivo', () => {
    it('escolher uma opção chama onUpdateObjetivo com a chave escolhida', async () => {
      const onUpdateObjetivo = vi.fn().mockResolvedValue(undefined);
      const renderer = await render(createElement(TreinoDetailScreen, baseProps({ onUpdateObjetivo })));

      const trigger = pressableWithText(renderer, 'treinos.detail.objetivoField.placeholder')!;
      await act(async () => { trigger.props.onPress(); });

      const option = pressableWithText(renderer, 'treinos.detail.objetivoField.options.forca')!;
      await act(async () => { option.props.onPress(); });
      await flush();

      expect(onUpdateObjetivo).toHaveBeenCalledWith('treinos.detail.objetivoField.options.forca');
    });

    it('"Sem objetivo" chama onUpdateObjetivo(null)', async () => {
      const onUpdateObjetivo = vi.fn().mockResolvedValue(undefined);
      const renderer = await render(
        createElement(TreinoDetailScreen, baseProps({
          onUpdateObjetivo,
          treino: { id: 't1', name: 'Peito', objetivo: 'Força', createdAt: 'x', updatedAt: 'x' },
        }))
      );

      const trigger = pressableWithText(renderer, 'Força')!;
      await act(async () => { trigger.props.onPress(); });

      const semObjetivo = pressableWithText(renderer, 'treinos.detail.objetivoField.semObjetivo')!;
      await act(async () => { semObjetivo.props.onPress(); });
      await flush();

      expect(onUpdateObjetivo).toHaveBeenCalledWith(null);
    });
  });

  it('adicionar 1 exercício via picker chama onAddExercicio', async () => {
    const onAddExercicio = vi.fn().mockResolvedValue(undefined);
    const exercisesById = new Map([['e9', ex('e9', 'Cadeira Extensora', ['Peito'])]]);
    const renderer = await render(
      createElement(TreinoDetailScreen, baseProps({
        onAddExercicio,
        availableExercises: [ex('e9', 'Cadeira Extensora', ['Peito'])],
        exercisesById,
      }))
    );

    const picker = byTestID(renderer, 'picker-Peito');
    await act(async () => { picker.props.onAdd('e9'); });

    expect(onAddExercicio).toHaveBeenCalledWith('e9');
  });

  it('adicionar vários: seleciona 2, mostra o contador e chama onAddMultiplosExercicios', async () => {
    const onAddMultiplosExercicios = vi.fn().mockResolvedValue(undefined);
    const availableExercises = [ex('e8', 'Leg Press', ['Peito']), ex('e9', 'Cadeira Extensora', ['Peito'])];
    const renderer = await render(
      createElement(TreinoDetailScreen, baseProps({ onAddMultiplosExercicios, availableExercises }))
    );

    expect(hasText(renderer, 'treinos.detail.toqueParaSelecionar')).toBe(true);

    await act(async () => { byTestID(renderer, 'picker-Peito').props.onToggleSelect('e9'); });
    await act(async () => { byTestID(renderer, 'picker-Peito').props.onToggleSelect('e8'); });

    expect(hasText(renderer, 'treinos.detail.adicionarSelecionados:{"count":2}')).toBe(true);

    const addSelecionadosBtn = pressableWithText(renderer, 'treinos.detail.adicionarSelecionados:{"count":2}')!;
    await act(async () => { addSelecionadosBtn.props.onPress(); });
    await flush();

    expect(onAddMultiplosExercicios).toHaveBeenCalledTimes(1);
    const args = onAddMultiplosExercicios.mock.calls[0][0] as string[];
    expect(args).toHaveLength(2);
    expect(args).toEqual(expect.arrayContaining(['e8', 'e9']));
    expect(hasText(renderer, 'treinos.detail.toqueParaSelecionar')).toBe(true);
  });

  describe('busca', () => {
    it('filtra por nome ou grupo muscular, e zera a seleção', async () => {
      const availableExercises = [ex('e5', 'Supino Reto', ['Peito']), ex('e6', 'Remada Curvada', ['Costas'])];
      const renderer = await render(createElement(TreinoDetailScreen, baseProps({ availableExercises })));

      await act(async () => { byTestID(renderer, 'picker-Peito').props.onToggleSelect('e5'); });
      expect(hasText(renderer, 'treinos.detail.adicionarSelecionados:{"count":1}')).toBe(true);

      const searchInput = textInputs(renderer).find((n) => n.props.placeholder === 'treinos.detail.buscarPlaceholder')!;
      await act(async () => { searchInput.props.onChangeText('rem'); });

      expect(byTestID(renderer, 'picker-Costas')).toBeDefined();
      expect(byTestID(renderer, 'picker-Peito')).toBeUndefined();
      expect(hasText(renderer, 'treinos.detail.toqueParaSelecionar')).toBe(true);
    });

    it('sem resultado mostra nenhumExercicioEncontrado', async () => {
      const availableExercises = [ex('e5', 'Supino Reto', ['Peito'])];
      const renderer = await render(createElement(TreinoDetailScreen, baseProps({ availableExercises })));

      const searchInput = textInputs(renderer).find((n) => n.props.placeholder === 'treinos.detail.buscarPlaceholder')!;
      await act(async () => { searchInput.props.onChangeText('zzz'); });

      expect(hasText(renderer, 'treinos.detail.nenhumExercicioEncontrado')).toBe(true);
    });

    it('sem exercícios disponíveis, a seção de adicionar não renderiza', async () => {
      const exercisesById = new Map([['e1', ex('e1', 'Supino')]]);
      const renderer = await render(
        createElement(TreinoDetailScreen, baseProps({ treinoExercicios: [te('t1', 'e1', 1)], availableExercises: [], exercisesById }))
      );
      expect(hasText(renderer, 'treinos.detail.adicionarExercicios')).toBe(false);
    });
  });

  describe('remover', () => {
    it.each(['t1', 't2', 't3'] as const)('remove %s chama onRemoveExercicio só com esse id (fixture com 3 candidatos)', async (targetId) => {
      const onRemoveExercicio = vi.fn().mockResolvedValue(undefined);
      const { exercisesById, treinoExercicios } = threeSingles();
      const renderer = await render(
        createElement(TreinoDetailScreen, baseProps({ onRemoveExercicio, treinoExercicios, exercisesById }))
      );
      await act(async () => { byTestID(renderer, `card-${targetId}`).props.onDesvincular(); });
      expect(onRemoveExercicio).toHaveBeenCalledTimes(1);
      expect(onRemoveExercicio).toHaveBeenCalledWith(targetId);
    });
  });

  describe('mover cima/baixo (single)', () => {
    it.each(['t1', 't2', 't3'] as const)('onMoveUp do card %s chama só onMoveUp com esse id', async (targetId) => {
      const onMoveUp = vi.fn().mockResolvedValue(undefined);
      const onMoveDown = vi.fn().mockResolvedValue(undefined);
      const { exercisesById, treinoExercicios } = threeSingles();
      const renderer = await render(
        createElement(TreinoDetailScreen, baseProps({ onMoveUp, onMoveDown, treinoExercicios, exercisesById }))
      );
      await act(async () => { byTestID(renderer, `card-${targetId}`).props.onMoveUp(); });
      expect(onMoveUp).toHaveBeenCalledWith(targetId);
      expect(onMoveDown).not.toHaveBeenCalled();
    });

    it.each(['t1', 't2', 't3'] as const)('onMoveDown do card %s chama só onMoveDown com esse id', async (targetId) => {
      const onMoveUp = vi.fn().mockResolvedValue(undefined);
      const onMoveDown = vi.fn().mockResolvedValue(undefined);
      const { exercisesById, treinoExercicios } = threeSingles();
      const renderer = await render(
        createElement(TreinoDetailScreen, baseProps({ onMoveUp, onMoveDown, treinoExercicios, exercisesById }))
      );
      await act(async () => { byTestID(renderer, `card-${targetId}`).props.onMoveDown(); });
      expect(onMoveDown).toHaveBeenCalledWith(targetId);
      expect(onMoveUp).not.toHaveBeenCalled();
    });
  });

  describe('mover bloco + isReordering', () => {
    it('setas do bloco chamam onMoveUp/onMoveDown com o primeiro exercício do grupo', async () => {
      const onMoveUp = vi.fn().mockResolvedValue(undefined);
      const onMoveDown = vi.fn().mockResolvedValue(undefined);
      const exercisesById = new Map([['e1', ex('e1', 'a')], ['e2', ex('e2', 'b')], ['e3', ex('e3', 'c')]]);
      const treinoExercicios = [
        te('t1', 'e1', 1),
        te('t2', 'e2', 2, { grupoId: 'g1' }),
        te('t3', 'e3', 3, { grupoId: 'g1' }),
      ];
      const renderer = await render(
        createElement(TreinoDetailScreen, baseProps({ onMoveUp, onMoveDown, treinoExercicios, exercisesById }))
      );

      const cima = renderer.root.findAll((n) => n.props.accessibilityLabel === 'treinos.detail.moverBlocoCima')[0];
      const baixo = renderer.root.findAll((n) => n.props.accessibilityLabel === 'treinos.detail.moverBlocoBaixo')[0];
      await act(async () => { cima.props.onPress(); });
      await act(async () => { baixo.props.onPress(); });

      expect(onMoveUp).toHaveBeenCalledWith('t2');
      expect(onMoveDown).toHaveBeenCalledWith('t2');
    });

    it('isReordering desabilita as setas de bloco', async () => {
      const exercisesById = new Map([['e1', ex('e1', 'a')], ['e2', ex('e2', 'b')], ['e3', ex('e3', 'c')]]);
      const treinoExercicios = [
        te('t1', 'e1', 1),
        te('t2', 'e2', 2, { grupoId: 'g1' }),
        te('t3', 'e3', 3, { grupoId: 'g1' }),
      ];
      const renderer = await render(
        createElement(TreinoDetailScreen, baseProps({ isReordering: true, treinoExercicios, exercisesById }))
      );

      const setas = renderer.root.findAll(
        (n) => n.props.accessibilityLabel === 'treinos.detail.moverBlocoCima' || n.props.accessibilityLabel === 'treinos.detail.moverBlocoBaixo'
      );
      expect(setas.length).toBeGreaterThan(0);
      for (const seta of setas) {
        expect(seta.props.disabled).toBe(true);
      }
    });
  });

  describe('mover dentro do grupo', () => {
    it('onMoveUpInGroup do card do meio (t2, grupo de 3) chama só onMoveUpInGroup com t2', async () => {
      const onMoveUpInGroup = vi.fn().mockResolvedValue(undefined);
      const onMoveDownInGroup = vi.fn().mockResolvedValue(undefined);
      const exercisesById = new Map([['e1', ex('e1', 'a')], ['e2', ex('e2', 'b')], ['e3', ex('e3', 'c')]]);
      const treinoExercicios = [
        te('t1', 'e1', 1, { grupoId: 'g1' }),
        te('t2', 'e2', 2, { grupoId: 'g1' }),
        te('t3', 'e3', 3, { grupoId: 'g1' }),
      ];
      const renderer = await render(
        createElement(TreinoDetailScreen, baseProps({ onMoveUpInGroup, onMoveDownInGroup, treinoExercicios, exercisesById }))
      );
      await act(async () => { byTestID(renderer, 'card-t2').props.onMoveUpInGroup(); });
      expect(onMoveUpInGroup).toHaveBeenCalledWith('t2');
      expect(onMoveDownInGroup).not.toHaveBeenCalled();
    });

    it('onMoveDownInGroup do card do meio (t2, grupo de 3) chama só onMoveDownInGroup com t2', async () => {
      const onMoveUpInGroup = vi.fn().mockResolvedValue(undefined);
      const onMoveDownInGroup = vi.fn().mockResolvedValue(undefined);
      const exercisesById = new Map([['e1', ex('e1', 'a')], ['e2', ex('e2', 'b')], ['e3', ex('e3', 'c')]]);
      const treinoExercicios = [
        te('t1', 'e1', 1, { grupoId: 'g1' }),
        te('t2', 'e2', 2, { grupoId: 'g1' }),
        te('t3', 'e3', 3, { grupoId: 'g1' }),
      ];
      const renderer = await render(
        createElement(TreinoDetailScreen, baseProps({ onMoveUpInGroup, onMoveDownInGroup, treinoExercicios, exercisesById }))
      );
      await act(async () => { byTestID(renderer, 'card-t2').props.onMoveDownInGroup(); });
      expect(onMoveDownInGroup).toHaveBeenCalledWith('t2');
      expect(onMoveUpInGroup).not.toHaveBeenCalled();
    });
  });

  describe('vincular com próximo', () => {
    it('vincula t2 (do meio, fixture com 3) com o próximo (t3), preservando o metodo de cada um', async () => {
      const onUpdateMetodoGrupo = vi.fn().mockResolvedValue(undefined);
      const exercisesById = new Map([['e1', ex('e1', 'a')], ['e2', ex('e2', 'b')], ['e3', ex('e3', 'c')]]);
      const treinoExercicios = [
        te('t1', 'e1', 1, { metodo: 'rest_pause' }),
        te('t2', 'e2', 2, { metodo: 'piramide' }),
        te('t3', 'e3', 3, { metodo: 'drop_set' }),
      ];
      const renderer = await render(
        createElement(TreinoDetailScreen, baseProps({ onUpdateMetodoGrupo, treinoExercicios, exercisesById }))
      );

      expect(byTestID(renderer, 'card-t2').props.canVincular).toBe(true);

      await act(async () => { await byTestID(renderer, 'card-t2').props.onVincular(); });

      expect(onUpdateMetodoGrupo).toHaveBeenCalledTimes(2);
      const gid1 = onUpdateMetodoGrupo.mock.calls[0][2] as string;
      const gid2 = onUpdateMetodoGrupo.mock.calls[1][2] as string;
      expect(gid1).toMatch(/^g_/);
      expect(gid1).toBe(gid2);
      expect(onUpdateMetodoGrupo.mock.calls[0]).toEqual(['t2', 'piramide', gid1]);
      expect(onUpdateMetodoGrupo.mock.calls[1]).toEqual(['t3', 'drop_set', gid2]);
      expect(onUpdateMetodoGrupo).not.toHaveBeenCalledWith('t1', expect.anything(), expect.anything());
    });

    it('sem próximo, canVincular é false e onVincular não chama onUpdateMetodoGrupo', async () => {
      const onUpdateMetodoGrupo = vi.fn().mockResolvedValue(undefined);
      const exercisesById = new Map([['e1', ex('e1', 'a')], ['e2', ex('e2', 'b')]]);
      const treinoExercicios = [te('t1', 'e1', 1), te('t2', 'e2', 2)];
      const renderer = await render(
        createElement(TreinoDetailScreen, baseProps({ onUpdateMetodoGrupo, treinoExercicios, exercisesById }))
      );

      expect(byTestID(renderer, 'card-t2').props.canVincular).toBe(false);
      await act(async () => { await byTestID(renderer, 'card-t2').props.onVincular(); });
      expect(onUpdateMetodoGrupo).not.toHaveBeenCalled();
    });
  });

  it('vincular próximo ao grupo chama onUpdateMetodoGrupo para todos os membros + o próximo, com o metodo de cada um', async () => {
    const onUpdateMetodoGrupo = vi.fn().mockResolvedValue(undefined);
    const exercisesById = new Map([['e1', ex('e1', 'a')], ['e2', ex('e2', 'b')], ['e3', ex('e3', 'c')]]);
    const treinoExercicios = [
      te('t1', 'e1', 1, { grupoId: 'g1', metodo: 'drop_set' }),
      te('t2', 'e2', 2, { grupoId: 'g1', metodo: 'piramide' }),
      te('t3', 'e3', 3, { metodo: 'rest_pause' }),
    ];
    const renderer = await render(
      createElement(TreinoDetailScreen, baseProps({ onUpdateMetodoGrupo, treinoExercicios, exercisesById }))
    );

    const btn = pressableWithText(renderer, 'treinos.detail.adicionarProximoAoGrupo')!;
    await act(async () => { btn.props.onPress(); });
    await flush();

    expect(onUpdateMetodoGrupo).toHaveBeenCalledTimes(3);
    expect(onUpdateMetodoGrupo).toHaveBeenCalledWith('t1', 'drop_set', 'g1');
    expect(onUpdateMetodoGrupo).toHaveBeenCalledWith('t2', 'piramide', 'g1');
    expect(onUpdateMetodoGrupo).toHaveBeenCalledWith('t3', 'rest_pause', 'g1');
  });

  describe('sair do grupo', () => {
    it('sai do grupo com 3 membros (alvo no meio, t2): só remove o próprio, sem dissolver', async () => {
      const onUpdateMetodoGrupo = vi.fn().mockResolvedValue(undefined);
      const exercisesById = new Map([['e1', ex('e1', 'a')], ['e2', ex('e2', 'b')], ['e3', ex('e3', 'c')]]);
      const treinoExercicios = [
        te('t1', 'e1', 1, { grupoId: 'g1' }),
        te('t2', 'e2', 2, { grupoId: 'g1' }),
        te('t3', 'e3', 3, { grupoId: 'g1' }),
      ];
      const renderer = await render(
        createElement(TreinoDetailScreen, baseProps({ onUpdateMetodoGrupo, treinoExercicios, exercisesById }))
      );
      await act(async () => { await byTestID(renderer, 'card-t2').props.onSairDoGrupo(); });
      expect(onUpdateMetodoGrupo).toHaveBeenCalledTimes(1);
      expect(onUpdateMetodoGrupo).toHaveBeenCalledWith('t2', 'normal', null);
    });

    it('sai do grupo com 2 membros (alvo é o último do grupo, precedido de um single): dissolve o restante com o metodo real dele', async () => {
      const onUpdateMetodoGrupo = vi.fn().mockResolvedValue(undefined);
      const exercisesById = new Map([['e1', ex('e1', 'a')], ['e2', ex('e2', 'b')], ['e3', ex('e3', 'c')]]);
      const treinoExercicios = [
        te('t1', 'e1', 1),
        te('t2', 'e2', 2, { grupoId: 'g1', metodo: 'piramide' }),
        te('t3', 'e3', 3, { grupoId: 'g1', metodo: 'drop_set' }),
      ];
      const renderer = await render(
        createElement(TreinoDetailScreen, baseProps({ onUpdateMetodoGrupo, treinoExercicios, exercisesById }))
      );
      await act(async () => { await byTestID(renderer, 'card-t3').props.onSairDoGrupo(); });
      expect(onUpdateMetodoGrupo).toHaveBeenCalledTimes(2);
      expect(onUpdateMetodoGrupo).toHaveBeenCalledWith('t3', 'normal', null);
      expect(onUpdateMetodoGrupo).toHaveBeenCalledWith('t2', 'piramide', null);
    });
  });

  it('desfazer grupo chama onUpdateMetodoGrupo para cada membro com o metodo real e grupoId null', async () => {
    const onUpdateMetodoGrupo = vi.fn().mockResolvedValue(undefined);
    const exercisesById = new Map([['e1', ex('e1', 'a')], ['e2', ex('e2', 'b')]]);
    const treinoExercicios = [
      te('t1', 'e1', 1, { grupoId: 'g1', metodo: 'piramide' }),
      te('t2', 'e2', 2, { grupoId: 'g1', metodo: 'drop_set' }),
    ];
    const renderer = await render(
      createElement(TreinoDetailScreen, baseProps({ onUpdateMetodoGrupo, treinoExercicios, exercisesById }))
    );

    const btn = pressableWithText(renderer, 'treinos.detail.desfazer')!;
    await act(async () => { btn.props.onPress(); });
    await flush();

    expect(onUpdateMetodoGrupo).toHaveBeenCalledTimes(2);
    expect(onUpdateMetodoGrupo).toHaveBeenCalledWith('t1', 'piramide', null);
    expect(onUpdateMetodoGrupo).toHaveBeenCalledWith('t2', 'drop_set', null);
  });

  it('séries/descanso unificados do bloco chamam onUpdateRecomendacoes para os membros', async () => {
    const onUpdateRecomendacoes = vi.fn().mockResolvedValue(undefined);
    const exercisesById = new Map([['e1', ex('e1', 'a')], ['e2', ex('e2', 'b')]]);
    const treinoExercicios = [
      te('t1', 'e1', 1, { grupoId: 'g1' }),
      te('t2', 'e2', 2, { grupoId: 'g1' }),
    ];
    const renderer = await render(
      createElement(TreinoDetailScreen, baseProps({ onUpdateRecomendacoes, treinoExercicios, exercisesById }))
    );

    const seriesInput = textInputs(renderer).find((n) => n.props.placeholder === '—' && n.props.defaultValue === '')!;
    await act(async () => { seriesInput.props.onChangeText('4'); });

    const saveBtn = pressableWithText(renderer, 'treinos.detail.salvarTreino')!;
    await act(async () => { saveBtn.props.onPress(); });
    await flush();

    expect(onUpdateRecomendacoes).toHaveBeenCalledWith('t1', 4, null, null, null);
    expect(onUpdateRecomendacoes).toHaveBeenCalledWith('t2', 4, null, null, null);
  });

  describe('recs por card + salvar', () => {
    it('converte os textos dos campos e chama onUpdateRecomendacoes + onBack', async () => {
      const onUpdateRecomendacoes = vi.fn().mockResolvedValue(undefined);
      const onBack = vi.fn();
      const exercisesById = new Map([['e3', ex('e3', 'Agachamento')]]);
      const renderer = await render(
        createElement(TreinoDetailScreen, baseProps({
          onUpdateRecomendacoes, onBack,
          treinoExercicios: [te('t3', 'e3', 1)],
          exercisesById,
        }))
      );

      await act(async () => { byTestID(renderer, 'card-t3').props.onChangeRecs('3', '12', '20,5', '90'); });

      const saveBtn = pressableWithText(renderer, 'treinos.detail.salvarTreino')!;
      await act(async () => { saveBtn.props.onPress(); });
      await flush();

      expect(onUpdateRecomendacoes).toHaveBeenCalledWith('t3', 3, 12, 20.5, 90);
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('carga "0" vira 0 (não null); carga vazia/inválida vira null', async () => {
      const onUpdateRecomendacoes = vi.fn().mockResolvedValue(undefined);
      const exercisesById = new Map([['e3', ex('e3', 'Agachamento')], ['e4', ex('e4', 'Leg')]]);
      const renderer = await render(
        createElement(TreinoDetailScreen, baseProps({
          onUpdateRecomendacoes,
          treinoExercicios: [te('t3', 'e3', 1), te('t4', 'e4', 2)],
          exercisesById,
        }))
      );

      await act(async () => { byTestID(renderer, 'card-t3').props.onChangeRecs('1', '10', '0', '30'); });
      await act(async () => { byTestID(renderer, 'card-t4').props.onChangeRecs('1', '10', 'abc', '30'); });

      const saveBtn = pressableWithText(renderer, 'treinos.detail.salvarTreino')!;
      await act(async () => { saveBtn.props.onPress(); });
      await flush();

      expect(onUpdateRecomendacoes).toHaveBeenCalledWith('t3', 1, 10, 0, 30);
      expect(onUpdateRecomendacoes).toHaveBeenCalledWith('t4', 1, 10, null, 30);
    });
  });

  describe('voltar salva tudo (useAndroidBack)', () => {
    it('back físico chama getSessaoAtiva, onUpdateRecomendacoes e onBack, retornando true', async () => {
      const getSessaoAtiva = vi.fn().mockResolvedValue(null);
      const onUpdateRecomendacoes = vi.fn().mockResolvedValue(undefined);
      const onBack = vi.fn();
      const exercisesById = new Map([['e3', ex('e3', 'Agachamento')]]);
      const renderer = await render(
        createElement(TreinoDetailScreen, baseProps({
          getSessaoAtiva, onUpdateRecomendacoes, onBack,
          treinoExercicios: [te('t3', 'e3', 1)],
          exercisesById,
        }))
      );

      let returned: boolean | undefined;
      await act(async () => {
        returned = backState.cb!();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(returned).toBe(true);
      expect(getSessaoAtiva).toHaveBeenCalledTimes(1);
      expect(onUpdateRecomendacoes).toHaveBeenCalledWith('t3', null, null, null, null);
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('sem exercícios, back físico só chama onBack (sem getSessaoAtiva)', async () => {
      const getSessaoAtiva = vi.fn().mockResolvedValue(null);
      const onBack = vi.fn();
      const renderer = await render(
        createElement(TreinoDetailScreen, baseProps({ getSessaoAtiva, onBack, treinoExercicios: [] }))
      );
      void renderer;

      await act(async () => {
        backState.cb!();
        await Promise.resolve();
      });

      expect(onBack).toHaveBeenCalledTimes(1);
      expect(getSessaoAtiva).not.toHaveBeenCalled();
    });
  });

  describe('conflito de sessão', () => {
    it('mostra o ConfirmDialog e, ao confirmar, cancela a sessão e salva', async () => {
      const getSessaoAtiva = vi.fn().mockResolvedValue({ id: 's1', treinoNomeSnapshot: 'Peito' });
      const cancelarSessao = vi.fn().mockResolvedValue(undefined);
      const onUpdateRecomendacoes = vi.fn().mockResolvedValue(undefined);
      const onBack = vi.fn();
      const exercisesById = new Map([['e3', ex('e3', 'Agachamento')]]);
      const renderer = await render(
        createElement(TreinoDetailScreen, baseProps({
          getSessaoAtiva, cancelarSessao, onUpdateRecomendacoes, onBack,
          treinoExercicios: [te('t3', 'e3', 1)],
          exercisesById,
        }))
      );

      const saveBtn = pressableWithText(renderer, 'treinos.detail.salvarTreino')!;
      await act(async () => { saveBtn.props.onPress(); });
      await flush();

      const confirm = byTestID(renderer, 'confirm');
      expect(confirm.props.visible).toBe(true);
      expect(confirm.props.message).toContain('"nome":"Peito"');

      await act(async () => { confirm.props.onConfirm(); });
      await flush();

      expect(cancelarSessao).toHaveBeenCalledWith('s1');
      expect(onUpdateRecomendacoes).toHaveBeenCalledWith('t3', null, null, null, null);
      expect(onBack).toHaveBeenCalledTimes(1);
      expect(cancelarSessao.mock.invocationCallOrder[0]).toBeLessThan(onUpdateRecomendacoes.mock.invocationCallOrder[0]);
    });

    it('ao cancelar, vai para a sessão e nada é salvo', async () => {
      const getSessaoAtiva = vi.fn().mockResolvedValue({ id: 's1', treinoNomeSnapshot: 'Peito' });
      const cancelarSessao = vi.fn().mockResolvedValue(undefined);
      const onUpdateRecomendacoes = vi.fn().mockResolvedValue(undefined);
      const onGoToSessao = vi.fn();
      const exercisesById = new Map([['e3', ex('e3', 'Agachamento')]]);
      const renderer = await render(
        createElement(TreinoDetailScreen, baseProps({
          getSessaoAtiva, cancelarSessao, onUpdateRecomendacoes, onGoToSessao,
          treinoExercicios: [te('t3', 'e3', 1)],
          exercisesById,
        }))
      );

      const saveBtn = pressableWithText(renderer, 'treinos.detail.salvarTreino')!;
      await act(async () => { saveBtn.props.onPress(); });
      await flush();

      const confirm = byTestID(renderer, 'confirm');
      await act(async () => { confirm.props.onCancel(); });
      await flush();

      expect(onGoToSessao).toHaveBeenCalledTimes(1);
      expect(cancelarSessao).not.toHaveBeenCalled();
      expect(onUpdateRecomendacoes).not.toHaveBeenCalled();
      expect(byTestID(renderer, 'confirm').props.visible).toBe(false);
    });
  });

  it('double-save guard: onUpdateRecomendacoes chamado uma vez por exercício mesmo com 2 presses', async () => {
    let resolveUpdate!: () => void;
    const onUpdateRecomendacoes = vi.fn(() => new Promise<void>((resolve) => { resolveUpdate = resolve; }));
    const onBack = vi.fn();
    const exercisesById = new Map([['e3', ex('e3', 'Agachamento')]]);
    const renderer = await render(
      createElement(TreinoDetailScreen, baseProps({
        onUpdateRecomendacoes, onBack,
        treinoExercicios: [te('t3', 'e3', 1)],
        exercisesById,
      }))
    );

    const primeiroPress = pressableWithText(renderer, 'treinos.detail.salvarTreino')!;
    await act(async () => {
      primeiroPress.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const segundoBtn = pressableWithText(renderer, 'treinos.detail.salvando')!;
    expect(segundoBtn.props.disabled).toBe(true);
    await act(async () => {
      segundoBtn.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      resolveUpdate();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onUpdateRecomendacoes).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('exportar chama onExportar e isExporting desabilita o botão', async () => {
    const onExportar = vi.fn();
    const renderer = await render(createElement(TreinoDetailScreen, baseProps({ onExportar, isExporting: true })));

    const btn = byTestID(renderer, 'exportar-btn');
    expect(btn.props.disabled).toBe(true);

    await act(async () => { btn.props.onPress(); });
    expect(onExportar).toHaveBeenCalledTimes(1);
  });

  describe('substitutos', () => {
    it.each(['t1', 't2', 't3'] as const)('abre o picker para %s com excludeExercicioId/currentAlternativaIds corretos, adiciona e fecha', async (targetId) => {
      const onAddAlternativa = vi.fn().mockResolvedValue(undefined);
      const { treinoExercicios } = threeSingles();
      const exercisesById = new Map([
        ['e1', ex('e1', 'Supino')], ['e2', ex('e2', 'Remada')], ['e3', ex('e3', 'Agachamento')], ['e7', ex('e7', 'Stiff')],
      ]);
      const targetExercicioId = treinoExercicios.find((t) => t.id === targetId)!.exercicioId;
      const alternativasByExercicioId = new Map([[targetExercicioId, [ex('e7', 'Stiff', ['Posterior'])]]]);
      const renderer = await render(
        createElement(TreinoDetailScreen, baseProps({ onAddAlternativa, treinoExercicios, exercisesById, alternativasByExercicioId }))
      );

      await act(async () => { byTestID(renderer, `card-${targetId}`).props.onOpenSubstitutoPicker(); });

      const substitutos = byTestID(renderer, 'substitutos');
      expect(substitutos.props.excludeExercicioId).toBe(targetExercicioId);
      expect(Array.from(substitutos.props.currentAlternativaIds as Set<string>)).toEqual(['e7']);

      await act(async () => { await substitutos.props.onAdd('e7'); });
      expect(onAddAlternativa).toHaveBeenCalledWith(targetExercicioId, 'e7');

      await act(async () => { substitutos.props.onClose(); });
      expect(byTestID(renderer, 'substitutos')).toBeUndefined();
    });
  });

  describe('remover alternativa', () => {
    it.each(['t1', 't2', 't3'] as const)('%s chama onRemoveAlternativa com o exercicioId correto', async (targetId) => {
      const onRemoveAlternativa = vi.fn().mockResolvedValue(undefined);
      const { treinoExercicios } = threeSingles();
      const exercisesById = new Map([
        ['e1', ex('e1', 'Supino')], ['e2', ex('e2', 'Remada')], ['e3', ex('e3', 'Agachamento')],
      ]);
      const targetExercicioId = treinoExercicios.find((t) => t.id === targetId)!.exercicioId;
      const alternativasByExercicioId = new Map([[targetExercicioId, [ex('e7', 'Stiff')]]]);
      const renderer = await render(
        createElement(TreinoDetailScreen, baseProps({ onRemoveAlternativa, treinoExercicios, exercisesById, alternativasByExercicioId }))
      );
      await act(async () => { byTestID(renderer, `card-${targetId}`).props.onRemoveAlternativa('e7'); });
      expect(onRemoveAlternativa).toHaveBeenCalledWith(targetExercicioId, 'e7');
    });
  });

  describe('mídia', () => {
    it.each([
      ['t1', 'e1', 'Supino'],
      ['t2', 'e2', 'Remada'],
      ['t3', 'e3', 'Agachamento'],
    ] as const)('abre o viewer do card %s com os dados do exercício %s (%s) e fecha', async (targetId, exercicioId, nome) => {
      const exercisesById = new Map([
        ['e1', ex('e1', 'Supino', ['Peito'], { mediaLocal: 'e1.gif', mediaOnline: 'https://e1' })],
        ['e2', ex('e2', 'Remada', ['Costas'], { mediaLocal: 'e2.gif', mediaOnline: 'https://e2' })],
        ['e3', ex('e3', 'Agachamento', ['Quadriceps'], { mediaLocal: 'e3.gif', mediaOnline: 'https://e3' })],
      ]);
      const treinoExercicios = [te('t1', 'e1', 1), te('t2', 'e2', 2), te('t3', 'e3', 3)];
      const renderer = await render(
        createElement(TreinoDetailScreen, baseProps({ treinoExercicios, exercisesById }))
      );

      await act(async () => { byTestID(renderer, `card-${targetId}`).props.onViewMedia(); });

      const media = byTestID(renderer, 'media');
      expect(media.props.exercicioNome).toBe(nome);
      expect(media.props.mediaLocal).toBe(`${exercicioId}.gif`);
      expect(media.props.mediaOnline).toBe(`https://${exercicioId}`);

      await act(async () => { media.props.onClose(); });
      expect(byTestID(renderer, 'media')).toBeUndefined();
    });

    it('abre o viewer a partir do picker de exercícios disponíveis', async () => {
      const availableExercises = [ex('e9', 'Cadeira Extensora', ['Peito'], { mediaLocal: null, mediaOnline: 'https://y' })];
      const renderer = await render(createElement(TreinoDetailScreen, baseProps({ availableExercises })));

      const picker = byTestID(renderer, 'picker-Peito');
      await act(async () => { picker.props.onViewMedia(availableExercises[0]); });

      const media = byTestID(renderer, 'media');
      expect(media.props.exercicioNome).toBe('Cadeira Extensora');
      expect(media.props.mediaOnline).toBe('https://y');
    });
  });
});
