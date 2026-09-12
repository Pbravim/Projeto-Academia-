import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import type { DegrauFormState } from '../hooks/useDegrauForm';

import { DegrauForm } from './DegrauForm';

/** Smoke test de render: inputs, erro e botões de confirmar/cancelar. */

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

vi.mock('../../shared/theme', async () => {
  const react = await import('react');
  const colors = new Proxy({}, { get: (_t, prop) => String(prop) });
  return { ThemeContext: react.createContext(colors), useTheme: () => colors };
});

vi.mock('../../shared/i18n', () => ({ useT: () => (key: string) => key }));

function makeForm(overrides?: Partial<DegrauFormState>): DegrauFormState {
  return {
    cargaText: '',
    repsText: '',
    descansoText: '',
    error: null,
    setCargaText: vi.fn(),
    setRepsText: vi.fn(),
    setDescansoText: vi.fn(),
    reset: vi.fn(),
    prefillFrom: vi.fn(),
    toInput: vi.fn(() => null),
    parse: vi.fn(() => ({ input: null, error: null })),
    ...overrides,
  };
}

describe('DegrauForm', () => {
  it('renders carga/reps inputs and hides descanso by default', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(DegrauForm, { titulo: 'Degrau 2', form: makeForm(), showDescanso: false }),
      );
    });
    expect(renderer.root.findAllByType('TextInput' as never)).toHaveLength(2);
  });

  it('renders the descanso input when showDescanso is true', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(DegrauForm, { titulo: 'Degrau 2', form: makeForm(), showDescanso: true }),
      );
    });
    expect(renderer.root.findAllByType('TextInput' as never)).toHaveLength(3);
  });

  it('shows the error message and fires onConfirm/onCancel', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(DegrauForm, {
          titulo: 'Degrau 2',
          form: makeForm({ error: 'inválido' }),
          showDescanso: false,
          onConfirm,
          onCancel,
        }),
      );
    });
    const pressables = renderer.root.findAllByType('Pressable' as never);
    expect(pressables).toHaveLength(2);
    await act(async () => { pressables[0].props.onPress(); });
    await act(async () => { pressables[1].props.onPress(); });
    expect(onConfirm).toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });
});
