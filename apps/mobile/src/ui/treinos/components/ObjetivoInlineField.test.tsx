import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { ObjetivoInlineField } from './ObjetivoInlineField';

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

vi.mock('../../shared/i18n', () => ({ useT: () => (key: string) => key }));

vi.mock('../../shared/theme', async () => {
  const react = await import('react');
  const colors = new Proxy({}, { get: (_t, prop) => String(prop) });
  return { ThemeContext: react.createContext(colors), useTheme: () => colors };
});

async function render(el: ReturnType<typeof createElement>): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(el); });
  return renderer;
}

function findText(renderer: ReactTestRenderer, text: string) {
  return renderer.root.findAll((n) => n.type === 'Text' && n.props.children === text);
}

describe('ObjetivoInlineField', () => {
  it('mostra placeholder quando value é vazio e o valor quando definido', async () => {
    const empty = await render(createElement(ObjetivoInlineField, { value: '', onChange: vi.fn() }));
    expect(findText(empty, 'treinos.detail.objetivoField.placeholder')).toHaveLength(1);

    const filled = await render(createElement(ObjetivoInlineField, { value: 'Força', onChange: vi.fn() }));
    expect(findText(filled, 'Força').length).toBeGreaterThan(0);
  });

  it('toca no trigger e abre a sheet com as 7 opções + Sem objetivo', async () => {
    const renderer = await render(createElement(ObjetivoInlineField, { value: '', onChange: vi.fn() }));
    const trigger = renderer.root.findByType('Pressable');

    await act(async () => { trigger.props.onPress(); });

    expect(findText(renderer, 'treinos.detail.objetivoField.semObjetivo')).toHaveLength(1);
    const optionKeys = [
      'treinos.detail.objetivoField.options.hipertrofia',
      'treinos.detail.objetivoField.options.forca',
      'treinos.detail.objetivoField.options.resistencia',
      'treinos.detail.objetivoField.options.emagrecimento',
      'treinos.detail.objetivoField.options.mobilidade',
      'treinos.detail.objetivoField.options.reabilitacao',
      'treinos.detail.objetivoField.options.condicionamento',
    ];
    for (const key of optionKeys) {
      expect(findText(renderer, key)).toHaveLength(1);
    }
  });

  it('escolher uma opção chama onChange com a opção e fecha a sheet', async () => {
    const onChange = vi.fn();
    const renderer = await render(createElement(ObjetivoInlineField, { value: '', onChange }));
    const trigger = renderer.root.findByType('Pressable');
    await act(async () => { trigger.props.onPress(); });

    const opt = 'treinos.detail.objetivoField.options.forca';
    const optionPressable = renderer.root.findAll(
      (n) => n.type === 'Pressable' && n.findAllByType('Text').some((t) => t.props.children === opt)
    )[0];
    await act(async () => { optionPressable.props.onPress(); });

    expect(onChange).toHaveBeenCalledWith(opt);
    expect(findText(renderer, opt)).toHaveLength(0);
  });

  it('Sem objetivo chama onChange com string vazia', async () => {
    const onChange = vi.fn();
    const renderer = await render(createElement(ObjetivoInlineField, { value: 'Força', onChange }));
    const trigger = renderer.root.findByType('Pressable');
    await act(async () => { trigger.props.onPress(); });

    const semObjetivoPressable = renderer.root.findAll(
      (n) => n.type === 'Pressable' && n.findAllByType('Text').some((t) => t.props.children === 'treinos.detail.objetivoField.semObjetivo')
    )[0];
    await act(async () => { semObjetivoPressable.props.onPress(); });

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('Sem objetivo chama onChange com string vazia e fecha a sheet (#70.2)', async () => {
    const onChange = vi.fn();
    const renderer = await render(createElement(ObjetivoInlineField, { value: 'Força', onChange }));
    const trigger = renderer.root.findByType('Pressable');
    await act(async () => { trigger.props.onPress(); });

    const semObjetivoPressable = renderer.root.findAll(
      (n) => n.type === 'Pressable' && n.findAllByType('Text').some((t) => t.props.children === 'treinos.detail.objetivoField.semObjetivo')
    )[0];
    await act(async () => { semObjetivoPressable.props.onPress(); });

    expect(onChange).toHaveBeenCalledWith('');
    expect(findText(renderer, 'treinos.detail.objetivoField.semObjetivo')).toHaveLength(0);
  });

  it('custom: digitar e confirmar chama onChange com o texto sem espaços e limpa o input', async () => {
    const onChange = vi.fn();
    const renderer = await render(createElement(ObjetivoInlineField, { value: '', onChange }));
    const trigger = renderer.root.findByType('Pressable');
    await act(async () => { trigger.props.onPress(); });

    const input = renderer.root.findByType('TextInput');
    await act(async () => { input.props.onChangeText('  Meu objetivo '); });
    const okBtn = renderer.root.findAll(
      (n) => n.type === 'Pressable' && n.findAllByType('Text').some((t) => t.props.children === 'common.ok')
    )[0];
    await act(async () => { okBtn.props.onPress(); });

    expect(onChange).toHaveBeenCalledWith('Meu objetivo');

    await act(async () => { trigger.props.onPress(); });
    expect(renderer.root.findByType('TextInput').props.value).toBe('');
  });

  it('custom vazio (apenas espaços) não chama onChange', async () => {
    const onChange = vi.fn();
    const renderer = await render(createElement(ObjetivoInlineField, { value: '', onChange }));
    const trigger = renderer.root.findByType('Pressable');
    await act(async () => { trigger.props.onPress(); });

    const input = renderer.root.findByType('TextInput');
    await act(async () => { input.props.onChangeText('   '); });
    const okBtn = renderer.root.findAll(
      (n) => n.type === 'Pressable' && n.findAllByType('Text').some((t) => t.props.children === 'common.ok')
    )[0];
    await act(async () => { okBtn.props.onPress(); });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('valor customizado aparece marcado com check na sheet', async () => {
    const renderer = await render(createElement(ObjetivoInlineField, { value: 'Meu objetivo raro', onChange: vi.fn() }));
    const trigger = renderer.root.findByType('Pressable');
    await act(async () => { trigger.props.onPress(); });

    const marked = renderer.root.findAll(
      (n) => n.type === 'View' && n.findAllByType('Text').some((t) => t.props.children === 'Meu objetivo raro')
    );
    expect(marked.length).toBeGreaterThan(0);
    expect(marked[0].findAllByType('Text').some((t) => t.props.children === '✓')).toBe(true);
  });
});
