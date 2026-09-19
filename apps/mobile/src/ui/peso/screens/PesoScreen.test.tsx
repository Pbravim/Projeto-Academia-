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

  it('mostra pesoAtual, gráfico com ≥2 pontos, erro/feedback e chama onChangePesoKg/onChangeObservacao/onChangeDate', async () => {
    const onChangePesoKg = vi.fn();
    const onChangeObservacao = vi.fn();
    const onChangeDate = vi.fn();
    const renderer = await render({
      ...baseProps,
      onChangePesoKg,
      onChangeObservacao,
      onChangeDate,
      errorMessage: 'Peso inválido',
      feedbackMessage: 'Registrado!',
      viewModel: {
        cards: [],
        emptyStateMessage: null,
        pesoAtual: '80 kg',
        chartPoints: [{ pesoKg: 80, label: '01/01' }, { pesoKg: 81, label: '02/01' }],
      },
    });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('Peso inválido');
    expect(texts).toContain('Registrado!');
    expect(renderer.root.findAllByType('LineChart')).toHaveLength(1);

    const inputs = renderer.root.findAllByType('TextInput');
    await act(async () => { (inputs[0].props as { onChangeText: (v: string) => void }).onChangeText('82'); });
    expect(onChangePesoKg).toHaveBeenCalledWith('82');
    await act(async () => { (inputs[1].props as { onChangeText: (v: string) => void }).onChangeText('boa forma'); });
    expect(onChangeObservacao).toHaveBeenCalledWith('boa forma');

    const dateTrigger = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => typeof t.props.children === 'string' && t.props.children.includes('01/01/2026')));
    await act(async () => { (dateTrigger!.props as { onPress: () => void }).onPress(); });

    const picker = renderer.root.findByType('DateTimePicker');
    await act(async () => {
      (picker.props as { onChange: (e: unknown, d: Date) => void }).onChange({}, new Date('2026-01-02'));
    });
    expect(onChangeDate).toHaveBeenCalled();
  });

  it('isSubmitting: mostra "salvando" e desabilita o botão e os campos', async () => {
    const renderer = await render({ ...baseProps, isSubmitting: true });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('peso.form.salvando');

    const submit = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'peso.form.salvando'));
    expect(submit!.props.disabled).toBe(true);

    const inputs = renderer.root.findAllByType('TextInput');
    expect(inputs[0].props.editable).toBe(false);
    expect(inputs[1].props.editable).toBe(false);
  });
});
