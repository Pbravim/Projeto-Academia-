import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import type { ExerciseCatalogControllerState, ExerciseDraft } from '../hooks/useExerciseCatalogController';

import { ExerciseCatalogScreen } from './ExerciseCatalogScreen';

/**
 * Smoke test de render: cobre o bloco de busca (filteredSections) desta tela,
 * que troca o predicado inline por matchesExerciseQuery (issue #29). O resto
 * da tela (formulário, chips, media) é mockado — fora do escopo desta fatia.
 */

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode),
);

interface SectionListMockProps {
  ListHeaderComponent?: ReactNode;
  sections: { key: string; section: unknown; data: unknown[] }[];
  renderItem: (info: { item: unknown; index: number; section: { data: unknown[] } }) => ReactNode;
  renderSectionHeader?: (info: { section: unknown }) => ReactNode;
}

function SectionListMock(props: SectionListMockProps) {
  return createElement(
    'View',
    {},
    props.ListHeaderComponent ?? null,
    props.sections.map((section) =>
      createElement(
        'View',
        { key: section.key },
        props.renderSectionHeader ? props.renderSectionHeader({ section }) : null,
        (section.data as unknown[]).map((item, index) =>
          createElement(
            'View',
            { key: index },
            props.renderItem({ item, index, section: section as unknown as { data: unknown[] } })
          )
        )
      )
    )
  );
}

vi.mock('react-native', () => ({
  ActivityIndicator: host('ActivityIndicator'),
  Pressable: host('Pressable'),
  ScrollView: host('ScrollView'),
  SectionList: SectionListMock,
  Text: host('Text'),
  TextInput: host('TextInput'),
  View: host('View'),
  StyleSheet: { create: (s: unknown) => s },
}));

vi.mock('../../shared/components/ConfirmDialog', () => ({ ConfirmDialog: () => null }));

vi.mock('../../shared/i18n', () => ({
  useLocale: () => 'pt-BR',
  useT: () => (key: string) => key,
}));

vi.mock('../../shared/theme', async () => {
  const react = await import('react');
  const colors = new Proxy({}, { get: (_t, prop) => String(prop) });
  return {
    ThemeContext: react.createContext(colors),
    useTheme: () => colors,
  };
});

vi.mock('../components/ExerciseFormFields', () => ({
  CATEGORIES: ['Composto'],
  EQUIPMENTS: ['Barra'],
  EXECUTION_TYPES: ['Unilateral'],
  MOVEMENT_PATTERNS: ['Horizontal Push'],
  PRIMARY_EQUIPMENTS: ['Rack'],
  ChipPicker: () => null,
  Field: () => null,
  MediaFields: () => null,
  MultiChipPicker: () => null,
}));

vi.mock('../components/ExerciseMediaViewer', () => ({ ExerciseMediaViewer: () => null }));

vi.mock('../components/ExerciseSection', () => ({
  ExerciseCardRow: (props: { card: { title: string } }) => createElement('Text', {}, props.card.title),
  ExerciseSectionHeader: (props: { groupMuscle: string }) => createElement('Text', {}, props.groupMuscle),
}));

vi.mock('../exerciseMetadataLabels', () => ({ metadataLabel: (_field: string, value: string) => value }));

async function render(el: ReturnType<typeof createElement>): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(el);
  });
  return renderer;
}

const initialDraft: ExerciseDraft = {
  name: '',
  groupMuscle: '',
  category: '',
  equipment: '',
  mediaOnline: '',
  mediaLocal: null,
  musculoAlvo: '',
  movementPattern: '',
  executionType: '',
  primaryEquipment: '',
  secondaryEquipment: '',
};

function makeExercise(id: string, name: string, overrides: Partial<ExercisePrimitives> = {}): ExercisePrimitives {
  return {
    id,
    name,
    normalizedName: name.toLowerCase(),
    groupMuscles: ['Peito'],
    category: 'Composto',
    equipment: null,
    loadUnit: 'kg',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    mediaOnline: null,
    mediaLocal: null,
    musculoAlvo: [],
    movementPattern: null,
    stabilizers: [],
    executionType: null,
    nameVariations: [],
    primaryEquipment: null,
    secondaryEquipment: null,
    catalogVersion: 0,
    trackingType: 'reps_load',
    ...overrides,
  };
}

function baseProps(exercises: ExercisePrimitives[]): ExerciseCatalogControllerState {
  return {
    draft: initialDraft,
    exercises,
    ultimosPesos: new Map(),
    alternativas: [],
    errorMessage: null,
    feedbackMessage: null,
    isLoading: false,
    isSubmitting: false,
    deletingId: null,
    editingExerciseId: null,
    onChangeField: vi.fn(),
    onChangeMediaLocal: vi.fn(),
    onSubmit: vi.fn(async () => {}),
    onSelectEdit: vi.fn(),
    onCancelEdit: vi.fn(),
    onDelete: vi.fn(async () => {}),
    onAddAlternativa: vi.fn(async () => {}),
    onRemoveAlternativa: vi.fn(async () => {}),
    onViewHistorico: vi.fn(),
  };
}

describe('ExerciseCatalogScreen — busca (matchesExerciseQuery)', () => {
  it('mostra todas as secoes sem busca e filtra por equipamento ao digitar', async () => {
    const exercises = [
      makeExercise('e1', 'Supino reto', { groupMuscles: ['Peito'] }),
      makeExercise('e2', 'Remada curvada', { groupMuscles: ['Costas'], equipment: 'Maquina Technogym' }),
    ];

    const renderer = await render(createElement(ExerciseCatalogScreen, baseProps(exercises)));

    // Sem busca, grupos vem colapsados por padrao — so o cabecalho aparece.
    let texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('Peito');
    expect(texts).toContain('Costas');
    expect(texts).not.toContain('Supino reto');

    const searchInput = renderer.root.findByType('TextInput');
    await act(async () => {
      (searchInput.props as { onChangeText: (v: string) => void }).onChangeText('technogym');
    });

    texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('Remada curvada');
    expect(texts).not.toContain('Supino reto');
  });

  it('mostra mensagem de nenhum resultado quando a busca nao casa nada', async () => {
    const exercises = [makeExercise('e1', 'Supino reto')];

    const renderer = await render(createElement(ExerciseCatalogScreen, baseProps(exercises)));

    const searchInput = renderer.root.findByType('TextInput');
    await act(async () => {
      (searchInput.props as { onChangeText: (v: string) => void }).onChangeText('inexistente');
    });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('exercises.catalog.noneFound');
  });
});
