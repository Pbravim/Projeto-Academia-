import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { PesoScreen } from './PesoScreen';

/** Smoke test de render: esta tela nunca era executada por teste. */

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode),
);

vi.mock('react-native', () => ({
  View: host('View'),
  Text: host('Text'),
  Pressable: host('Pressable'),
  ScrollView: host('ScrollView'),
  TextInput: host('TextInput'),
  ActivityIndicator: host('ActivityIndicator'),
  StyleSheet: { create: (s: unknown) => s },
  Platform: { OS: 'android' },
}));

vi.mock('@react-native-community/datetimepicker', () => ({ default: host('DateTimePicker') }));

vi.mock('../../shared/LineChart', () => ({ LineChart: host('LineChart') }));

vi.mock('../../shared/i18n', () => ({
  useT: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));

vi.mock('../../shared/i18n/formatters', () => ({
  formatFullDate: () => '01/01/2026',
  formatTime: () => '10:00',
}));

vi.mock('../../shared/theme', async () => {
  const react = await import('react');
  const colors = new Proxy({}, { get: (_t, prop) => String(prop) });
  return {
    ThemeContext: react.createContext(colors),
    useTheme: () => colors,
  };
});

async function render(props: Parameters<typeof PesoScreen>[0]): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(createElement(PesoScreen, props));
  });
  return renderer;
}

const baseProps: Parameters<typeof PesoScreen>[0] = {
  viewModel: { cards: [], emptyStateMessage: 'Sem registros', pesoAtual: null, chartPoints: [] },
  pesoKgInput: '',
  observacaoInput: '',
  selectedDate: new Date('2026-01-01T10:00:00'),
  errorMessage: null,
  feedbackMessage: null,
  isLoading: false,
  isSubmitting: false,
  deletingId: null,
  onChangePesoKg: vi.fn(),
  onChangeObservacao: vi.fn(),
  onChangeDate: vi.fn(),
  onSubmit: vi.fn(async () => {}),
  onDelete: vi.fn(async () => {}),
};

describe('PesoScreen', () => {
  it('vazio: mostra o estado vazio e chama onSubmit ao registrar', async () => {
    const onSubmit = vi.fn(async () => {});
    const renderer = await render({ ...baseProps, onSubmit });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('Sem registros');

    const submit = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'peso.form.registrar'));
    await act(async () => {
      (submit!.props as { onPress: () => void }).onPress();
    });
    expect(onSubmit).toHaveBeenCalled();
  });

  it('com registro: mostra o card e chama onDelete', async () => {
    const onDelete = vi.fn(async () => {});
    const renderer = await render({
      ...baseProps,
      onDelete,
      viewModel: {
        cards: [{ id: 'r1', peso: '80 kg', data: '01/01', observacao: null, delta: null, pesoAumentou: false }],
        emptyStateMessage: null,
        pesoAtual: '80 kg',
        chartPoints: [],
      },
    });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('80 kg');

    const del = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'common.delete'));
    await act(async () => {
      (del!.props as { onPress: () => void }).onPress();
    });
    expect(onDelete).toHaveBeenCalledWith('r1');
  });
});
