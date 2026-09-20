import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { TreinoDetailHeader, type TreinoDetailHeaderProps } from './TreinoDetailHeader';

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode)
);

vi.mock('react-native', () => ({
  Pressable: host('Pressable'),
  Text: host('Text'),
  TextInput: host('TextInput'),
  View: host('View'),
  StyleSheet: { create: (s: unknown) => s },
}));

vi.mock('../../shared/i18n', () => ({ useT: () => (key: string) => key }));

vi.mock('../../shared/theme', async () => {
  const react = await import('react');
  const colors = new Proxy({}, { get: (_t, prop) => String(prop) });
  return { ThemeContext: react.createContext(colors), useTheme: () => colors };
});

vi.mock('./ExportarTreinoButton', () => ({
  ExportarTreinoButton: (props: { isExporting: boolean; onPress: () => void }) =>
    createElement('Pressable', { testID: 'exportar-btn', disabled: props.isExporting, onPress: props.onPress }),
}));

vi.mock('./ObjetivoInlineField', () => ({
  ObjetivoInlineField: (props: { value: string; onChange: (v: string) => void }) =>
    createElement('Pressable', { testID: 'objetivo-field', onPress: () => props.onChange(props.value) }),
}));

async function render(el: ReturnType<typeof createElement>): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(el); });
  return renderer;
}

function baseProps(overrides: Partial<TreinoDetailHeaderProps> = {}): TreinoDetailHeaderProps {
  return {
    nome: 'Peito',
    objetivo: '',
    isSaving: false,
    isExporting: false,
    onSaveAll: vi.fn(),
    onUpdateNome: vi.fn(),
    onUpdateObjetivo: vi.fn(),
    onExportar: vi.fn(),
    ...overrides,
  };
}

function findText(renderer: ReactTestRenderer, text: string) {
  return renderer.root.findAll((n) => n.type === 'Text' && n.props.children === text);
}

describe('TreinoDetailHeader', () => {
  it('voltar mostra common.backArrow e chama onSaveAll; com isSaving mostra salvando e fica disabled', async () => {
    const onSaveAll = vi.fn();
    const renderer = await render(createElement(TreinoDetailHeader, baseProps({ onSaveAll })));
    const backBtn = renderer.root.findAllByType('Pressable')[0];

    expect(findText(renderer, 'common.backArrow')).toHaveLength(1);
    await act(async () => { backBtn.props.onPress(); });
    expect(onSaveAll).toHaveBeenCalledTimes(1);

    const saving = await render(createElement(TreinoDetailHeader, baseProps({ isSaving: true })));
    expect(findText(saving, 'treinos.detail.salvando')).toHaveLength(1);
    expect(saving.root.findAllByType('Pressable')[0].props.disabled).toBe(true);
  });

  it('✎ abre edição pré-preenchida com nome', async () => {
    const renderer = await render(createElement(TreinoDetailHeader, baseProps({ nome: 'Peito' })));
    const editBtn = renderer.root.findAll(
      (n) => n.type === 'Pressable' && n.findAllByType('Text').some((t) => t.props.children === '✎')
    )[0];

    await act(async () => { editBtn.props.onPress(); });

    expect(renderer.root.findByType('TextInput').props.value).toBe('Peito');
  });

  it('editar e submeter chama onUpdateNome com o nome trimado e fecha a edição', async () => {
    const onUpdateNome = vi.fn().mockResolvedValue(undefined);
    const renderer = await render(createElement(TreinoDetailHeader, baseProps({ nome: 'Peito', onUpdateNome })));
    const editBtn = renderer.root.findAll(
      (n) => n.type === 'Pressable' && n.findAllByType('Text').some((t) => t.props.children === '✎')
    )[0];
    await act(async () => { editBtn.props.onPress(); });

    const input = renderer.root.findByType('TextInput');
    await act(async () => { input.props.onChangeText('  Peito B  '); });
    await act(async () => { input.props.onSubmitEditing(); });

    expect(onUpdateNome).toHaveBeenCalledWith('Peito B');
    expect(renderer.root.findAllByType('TextInput')).toHaveLength(0);
  });

  it('nome igual ou vazio não chama onUpdateNome', async () => {
    const onUpdateNome = vi.fn();
    const renderer = await render(createElement(TreinoDetailHeader, baseProps({ nome: 'Peito', onUpdateNome })));
    let editBtn = renderer.root.findAll(
      (n) => n.type === 'Pressable' && n.findAllByType('Text').some((t) => t.props.children === '✎')
    )[0];
    await act(async () => { editBtn.props.onPress(); });
    let input = renderer.root.findByType('TextInput');
    await act(async () => { input.props.onChangeText('Peito'); });
    await act(async () => { input.props.onSubmitEditing(); });
    expect(onUpdateNome).not.toHaveBeenCalled();

    editBtn = renderer.root.findAll(
      (n) => n.type === 'Pressable' && n.findAllByType('Text').some((t) => t.props.children === '✎')
    )[0];
    await act(async () => { editBtn.props.onPress(); });
    input = renderer.root.findByType('TextInput');
    await act(async () => { input.props.onChangeText('   '); });
    await act(async () => { input.props.onSubmitEditing(); });
    expect(onUpdateNome).not.toHaveBeenCalled();
  });

  it('exportar repassa isExporting/onExportar', async () => {
    const onExportar = vi.fn();
    const renderer = await render(createElement(TreinoDetailHeader, baseProps({ isExporting: true, onExportar })));
    const btn = renderer.root.find((n) => n.props.testID === 'exportar-btn');

    expect(btn.props.disabled).toBe(true);
    await act(async () => { btn.props.onPress(); });
    expect(onExportar).toHaveBeenCalledTimes(1);
  });

  it('voltar, salvar nome e ✎ têm accessibilityRole="button" e accessibilityLabel (#70.1)', async () => {
    const renderer = await render(createElement(TreinoDetailHeader, baseProps({ nome: 'Peito' })));
    const backBtn = renderer.root.findAllByType('Pressable')[0];
    expect(backBtn.props.accessibilityRole).toBe('button');
    expect(backBtn.props.accessibilityLabel).toBe('common.backArrow');

    const editBtn = renderer.root.findAll(
      (n) => n.type === 'Pressable' && n.findAllByType('Text').some((t) => t.props.children === '✎')
    )[0];
    expect(editBtn.props.accessibilityRole).toBe('button');
    expect(editBtn.props.accessibilityLabel).toBe('✎');

    await act(async () => { editBtn.props.onPress(); });
    const saveNomeBtn = renderer.root.findAll(
      (n) => n.type === 'Pressable' && n.findAllByType('Text').some((t) => t.props.children === 'common.save')
    )[0];
    expect(saveNomeBtn.props.accessibilityRole).toBe('button');
    expect(saveNomeBtn.props.accessibilityLabel).toBe('common.save');
  });

  it('objetivo vazio chama onUpdateObjetivo(null); com valor repassa o valor', async () => {
    const onUpdateObjetivoVazio = vi.fn();
    const rendererVazio = await render(createElement(TreinoDetailHeader, baseProps({ objetivo: '', onUpdateObjetivo: onUpdateObjetivoVazio })));
    await act(async () => { rendererVazio.root.find((n) => n.props.testID === 'objetivo-field').props.onPress(); });
    expect(onUpdateObjetivoVazio).toHaveBeenCalledWith(null);

    const onUpdateObjetivoComValor = vi.fn();
    const rendererComValor = await render(createElement(TreinoDetailHeader, baseProps({ objetivo: 'Força', onUpdateObjetivo: onUpdateObjetivoComValor })));
    await act(async () => { rendererComValor.root.find((n) => n.props.testID === 'objetivo-field').props.onPress(); });
    expect(onUpdateObjetivoComValor).toHaveBeenCalledWith('Força');
  });
});
