import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';

import { EscolherExercicioModal } from './EscolherExercicioModal';

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode)
);

vi.mock('react-native', () => ({
  Modal: (props: Record<string, unknown>) => (props.visible ? createElement('View', {}, props.children as ReactNode) : null),
  Pressable: host('Pressable'),
  ScrollView: host('ScrollView'),
  Text: host('Text'),
  TextInput: host('TextInput'),
  View: host('View'),
  StyleSheet: { create: (s: unknown) => s },
}));

vi.mock('../../shared/i18n', () => ({
  useT: () => (key: string) => key,
}));

vi.mock('../../shared/theme', async () => {
  const react = await import('react');
  const colors = new Proxy({}, { get: (_t, prop) => String(prop) });
  return { ThemeContext: react.createContext(colors), useTheme: () => colors };
});

vi.mock('../../exercises/components/ExerciseFormFields', () => ({
  Field: (props: { value: string; onChangeText: (v: string) => void }) =>
    createElement('TextInput', { testID: 'field-nome', value: props.value, onChangeText: props.onChangeText }),
  MultiChipPicker: (props: { value: string; onChange: (v: string) => void }) =>
    createElement('TextInput', { testID: 'field-grupos', value: props.value, onChangeText: props.onChange }),
  ChipPicker: (props: { value: string; onChange: (v: string) => void }) =>
    createElement('TextInput', { testID: 'field-categoria', value: props.value, onChangeText: props.onChange }),
}));

async function render(el: ReturnType<typeof createElement>): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(el); });
  return renderer;
}

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

const supinoReto = makeExercise('ex-1', 'Supino reto');
const tricepsCorda = makeExercise('ex-2', 'Triceps corda');
const agachamento = makeExercise('ex-3', 'Agachamento livre');
const catalogo = [supinoReto, tricepsCorda, agachamento];

describe('EscolherExercicioModal', () => {
  it('mostra os candidatos primeiro (sem busca); fecha via botao voltar e via tab "buscar"', async () => {
    const onClose = vi.fn();
    const renderer = await render(
      createElement(EscolherExercicioModal, {
        visible: true,
        nomeSugerido: 'Supino',
        candidatos: [supinoReto],
        catalogo,
        onSelect: vi.fn(),
        onCriarCustom: vi.fn(),
        onClose,
      })
    );

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts.flat()).toContain('Supino reto');
    expect(texts.flat()).not.toContain('Triceps corda');

    const [backBtn, tabBuscar] = renderer.root.findAllByType('Pressable');
    expect(backBtn!.props.style({ pressed: true })).toContainEqual({ opacity: 0.6 });
    expect(backBtn!.props.style({ pressed: false })).not.toContainEqual({ opacity: 0.6 });
    await act(async () => { backBtn!.props.onPress(); });
    expect(onClose).toHaveBeenCalledTimes(1);

    expect(tabBuscar!.props.style({ pressed: true })).toContainEqual({ opacity: 0.8 });
    expect(tabBuscar!.props.style({ pressed: false })).not.toContainEqual({ opacity: 0.8 });
    await act(async () => { tabBuscar!.props.onPress(); });
  });

  it('a busca usa matchesExerciseQuery sobre o catalogo inteiro; tocar num resultado chama onSelect', async () => {
    const onSelect = vi.fn();
    const renderer = await render(
      createElement(EscolherExercicioModal, {
        visible: true,
        nomeSugerido: 'X',
        candidatos: [],
        catalogo,
        onSelect,
        onCriarCustom: vi.fn(),
        onClose: vi.fn(),
      })
    );

    const searchInput = renderer.root.find((n) => n.props.returnKeyType === 'search');
    await act(async () => { searchInput.props.onChangeText('triceps'); });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts.flat()).toContain('Triceps corda');
    expect(texts.flat()).not.toContain('Supino reto');

    const resultado = renderer.root
      .findAllByType('Pressable')
      .find((n) => n.findAllByType('Text').some((t2) => t2.props.children === 'Triceps corda'))!;
    expect(resultado.props.style({ pressed: true })).toContainEqual({ opacity: 0.75 });
    expect(resultado.props.style({ pressed: false })).not.toContainEqual({ opacity: 0.75 });
    await act(async () => { resultado.props.onPress(); });
    expect(onSelect).toHaveBeenCalledWith('ex-2');
  });

  it('aba custom: nome pre-preenchido, "Criar" desabilitado sem grupo, habilita e chama onCriarCustom apos escolher grupo', async () => {
    const onCriarCustom = vi.fn();
    const renderer = await render(
      createElement(EscolherExercicioModal, {
        visible: true,
        nomeSugerido: 'Leg press 45',
        candidatos: [],
        catalogo,
        onSelect: vi.fn(),
        onCriarCustom,
        onClose: vi.fn(),
      })
    );

    const tabCustom = renderer.root.findAllByType('Pressable')[2]!;
    await act(async () => { tabCustom.props.onPress(); });

    const nomeField = renderer.root.find((n) => n.props.testID === 'field-nome');
    expect(nomeField.props.value).toBe('Leg press 45');

    const criarBtn = renderer.root.findAllByType('Pressable').at(-1)!;
    expect(criarBtn.props.disabled).toBe(true);

    const gruposField = renderer.root.find((n) => n.props.testID === 'field-grupos');
    await act(async () => { gruposField.props.onChangeText('Quadriceps'); });

    const criarBtnDepois = renderer.root.findAllByType('Pressable').at(-1)!;
    expect(criarBtnDepois.props.disabled).toBe(false);
    expect(criarBtnDepois.props.style({ pressed: true })).toContainEqual({ opacity: 0.85 });
    expect(criarBtnDepois.props.style({ pressed: false })).not.toContainEqual({ opacity: 0.85 });

    await act(async () => { criarBtnDepois.props.onPress(); });

    expect(onCriarCustom).toHaveBeenCalledWith({ nome: 'Leg press 45', groupMuscles: ['Quadriceps'], category: '' });
  });
});
