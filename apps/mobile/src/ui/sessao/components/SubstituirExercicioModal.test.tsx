import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import type { CandidatoSubstituto } from '../../../application/sessoes/use-cases/SugerirSubstitutosUseCase';
import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';

import { SubstituirExercicioModal } from './SubstituirExercicioModal';

/**
 * Smoke test de render: este componente (modal de substituicao de exercicio,
 * busca por nome/grupo/equipamento) nunca era executado por teste.
 */

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode),
);

vi.mock('react-native', () => ({
  Modal: host('Modal'),
  View: host('View'),
  Text: host('Text'),
  Pressable: host('Pressable'),
  ScrollView: host('ScrollView'),
  TextInput: host('TextInput'),
  StyleSheet: { create: (s: unknown) => s },
}));

vi.mock('expo-image', () => ({ Image: host('Image') }));

vi.mock('../../shared/exerciseMedia', () => ({
  resolveFullMediaSource: vi.fn(() => null),
  resolveThumbSource: vi.fn(() => null),
  resolveThumbSourceOrPlaceholder: vi.fn(() => ({ uri: 'placeholder' })),
}));

vi.mock('../../shared/theme', async () => {
  const react = await import('react');
  const colors = new Proxy({}, { get: (_t, prop) => String(prop) });
  return {
    ThemeContext: react.createContext(colors),
    useTheme: () => colors,
  };
});

vi.mock('../../shared/i18n', () => ({
  useT: () => (key: string) => key,
}));

async function render(el: ReturnType<typeof createElement>): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(el);
  });
  return renderer;
}

function makeExercise(id: string, name: string, overrides: Partial<ExercisePrimitives> = {}): ExercisePrimitives {
  return {
    id,
    name,
    groupMuscles: ['Peito'],
    equipment: null,
    nameVariations: [],
    primaryEquipment: null,
    secondaryEquipment: null,
    mediaLocal: null,
    ...overrides,
  } as ExercisePrimitives;
}

function makeCandidato(
  id: string,
  name: string,
  similaridade: CandidatoSubstituto['similaridade'],
  overrides: Partial<ExercisePrimitives> = {},
): CandidatoSubstituto {
  return {
    exercicio: makeExercise(id, name, overrides),
    predefinido: false,
    similaridade,
    ultimaExecucao: null,
  };
}

describe('SubstituirExercicioModal', () => {
  it('esconde candidatos "catalogo" sem busca e mostra ao digitar uma query que casa', async () => {
    const candidatos: CandidatoSubstituto[] = [
      makeCandidato('ex1', 'Supino reto', 'mesmo_grupo'),
      makeCandidato('ex2', 'Remada curvada', 'catalogo', { groupMuscles: ['Costas'], equipment: 'Maquina Technogym' }),
    ];

    const renderer = await render(
      createElement(SubstituirExercicioModal, {
        visible: true,
        candidatos,
        onConfirmar: vi.fn(),
        onFechar: vi.fn(),
      }),
    );

    let texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('Supino reto');
    expect(texts).not.toContain('Remada curvada');

    const input = renderer.root.findByType('TextInput');
    await act(async () => {
      (input.props as { onChangeText: (v: string) => void }).onChangeText('technogym');
    });

    texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('Remada curvada');
    expect(texts).toContain('sessao.substituir.catalogo');
  });

  it('mostra mensagem de nenhum resultado quando a busca nao casa nada', async () => {
    const candidatos: CandidatoSubstituto[] = [makeCandidato('ex1', 'Supino reto', 'mesmo_grupo')];

    const renderer = await render(
      createElement(SubstituirExercicioModal, {
        visible: true,
        candidatos,
        onConfirmar: vi.fn(),
        onFechar: vi.fn(),
      }),
    );

    const input = renderer.root.findByType('TextInput');
    await act(async () => {
      (input.props as { onChangeText: (v: string) => void }).onChangeText('inexistente');
    });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('sessao.substituir.semResultado');
  });

  it('seleciona um candidato, confirma e reseta a busca', async () => {
    const candidatos: CandidatoSubstituto[] = [makeCandidato('ex1', 'Supino reto', 'mesmo_grupo')];
    const onConfirmar = vi.fn();

    const renderer = await render(
      createElement(SubstituirExercicioModal, {
        visible: true,
        candidatos,
        onConfirmar,
        onFechar: vi.fn(),
      }),
    );

    const row = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'Supino reto'));
    await act(async () => {
      (row!.props as { onPress: () => void }).onPress();
    });

    const confirmarBtn = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'sessao.substituir.confirmar'));
    await act(async () => {
      (confirmarBtn!.props as { onPress: () => void }).onPress();
    });

    expect(onConfirmar).toHaveBeenCalledWith('ex1', null);
  });

  it('fecha o modal e chama onFechar', async () => {
    const onFechar = vi.fn();
    const renderer = await render(
      createElement(SubstituirExercicioModal, {
        visible: true,
        candidatos: [],
        onConfirmar: vi.fn(),
        onFechar,
      }),
    );

    const closeBtn = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === '✕'));
    await act(async () => {
      (closeBtn!.props as { onPress: () => void }).onPress();
    });

    expect(onFechar).toHaveBeenCalled();
  });
});
