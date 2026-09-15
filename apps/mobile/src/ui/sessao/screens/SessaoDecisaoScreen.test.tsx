import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import type { DecisaoFinalizacao } from '../../../application/sessoes/use-cases/GetDecisaoFinalizacaoUseCase';

import { SessaoDecisaoScreen } from './SessaoDecisaoScreen';

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode),
);

vi.mock('react-native', () => ({
  View: host('View'),
  Text: host('Text'),
  ScrollView: host('ScrollView'),
  TextInput: (props: Record<string, unknown>) => createElement('TextInput', props),
  Pressable: (props: Record<string, unknown>) =>
    createElement('Pressable', props, props.children as ReactNode),
  StyleSheet: { create: (s: unknown) => s },
}));

vi.mock('../../shared/theme', async () => {
  const react = await import('react');
  const colors = new Proxy({}, { get: (_t, prop) => String(prop) });
  return { ThemeContext: react.createContext(colors), useTheme: () => colors };
});

vi.mock('../../shared/i18n', () => ({
  useT: () => (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key),
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

const decisaoSalvar: DecisaoFinalizacao = {
  tipo: 'salvar_como_treino',
  nomeAtual: 'Treino livre 13/09',
  totalExercicios: 2,
};

const decisaoAdicionar: DecisaoFinalizacao = {
  tipo: 'adicionar_ao_treino',
  treinoId: 't1',
  treinoNome: 'Treino A',
  avulsos: [
    { sessaoExercicioId: 'se1', exercicioId: 'ex1', nome: 'Supino', seriesValidas: 3 },
    { sessaoExercicioId: 'se2', exercicioId: 'ex2', nome: 'Remada', seriesValidas: 2 },
  ],
};

function baseProps(overrides: Partial<Parameters<typeof SessaoDecisaoScreen>[0]> = {}) {
  return {
    decisao: decisaoSalvar,
    nome: 'Treino livre 13/09',
    selecionados: new Set<string>(),
    isSalvando: false,
    errorMessage: null,
    onChangeNome: vi.fn(),
    onToggleSelecionado: vi.fn(),
    onSalvarComoTreino: vi.fn().mockResolvedValue(undefined),
    onAdicionarSelecionados: vi.fn().mockResolvedValue(undefined),
    onIgnorar: vi.fn(),
    ...overrides,
  };
}

describe('SessaoDecisaoScreen — salvar_como_treino', () => {
  it('renders the nome input pre-filled and a disabled state is respected', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(SessaoDecisaoScreen, baseProps()));
    });
    const input = renderer.root.findByType('TextInput' as never);
    expect(input.props.value).toBe('Treino livre 13/09');
    expect(input.props.accessibilityLabel).toBe('sessao.decisao.nomeLabel');
  });

  it('calls onSalvarComoTreino when the primary button is pressed', async () => {
    const onSalvarComoTreino = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(SessaoDecisaoScreen, baseProps({ onSalvarComoTreino })));
    });
    const btn = pressableWithText(renderer, 'sessao.decisao.salvarBtn')!;
    await act(async () => { (btn.props as { onPress: () => void }).onPress(); });
    expect(onSalvarComoTreino).toHaveBeenCalledTimes(1);
  });

  it('disables the save button when the nome is too short', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(SessaoDecisaoScreen, baseProps({ nome: 'a' })));
    });
    const btn = pressableWithText(renderer, 'sessao.decisao.salvarBtn')!;
    expect(btn.props.disabled).toBe(true);
  });

  it('calls onIgnorar when "nao salvar" is pressed', async () => {
    const onIgnorar = vi.fn();
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(SessaoDecisaoScreen, baseProps({ onIgnorar })));
    });
    const btn = pressableWithText(renderer, 'sessao.decisao.naoSalvarBtn')!;
    await act(async () => { (btn.props as { onPress: () => void }).onPress(); });
    expect(onIgnorar).toHaveBeenCalledTimes(1);
  });

  it('shows the errorMessage when present', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(SessaoDecisaoScreen, baseProps({ errorMessage: 'Já existe um treino com esse nome.' })),
      );
    });
    expect(renderer.toJSON()).not.toBeNull();
    const texts = renderer.root.findAllByType('Text' as never).map((n) => extractText(n.props.children));
    expect(texts.some((t) => t.includes('Já existe um treino'))).toBe(true);
  });
});

describe('SessaoDecisaoScreen — adicionar_ao_treino', () => {
  it('renders a checkbox row per avulso, checked by default', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(SessaoDecisaoScreen, baseProps({ decisao: decisaoAdicionar, selecionados: new Set(['se1', 'se2']) })),
      );
    });
    const checkboxes = renderer.root.findAll((n) => n.type === 'Pressable' && n.props.accessibilityRole === 'checkbox');
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes.every((cb) => cb.props.accessibilityState.checked === true)).toBe(true);
  });

  it('calls onToggleSelecionado with the sessaoExercicioId when a checkbox is pressed', async () => {
    const onToggleSelecionado = vi.fn();
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(SessaoDecisaoScreen, baseProps({ decisao: decisaoAdicionar, selecionados: new Set(['se1', 'se2']), onToggleSelecionado })),
      );
    });
    const checkboxes = renderer.root.findAll((n) => n.type === 'Pressable' && n.props.accessibilityRole === 'checkbox');
    await act(async () => { (checkboxes[0].props as { onPress: () => void }).onPress(); });
    expect(onToggleSelecionado).toHaveBeenCalledWith('se1');
  });

  it('disables the add button when nothing is selected', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(SessaoDecisaoScreen, baseProps({ decisao: decisaoAdicionar, selecionados: new Set() })),
      );
    });
    const btn = pressableWithText(renderer, 'sessao.decisao.adicionarBtn')!;
    expect(btn.props.disabled).toBe(true);
  });

  it('calls onAdicionarSelecionados when the add button is pressed', async () => {
    const onAdicionarSelecionados = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(SessaoDecisaoScreen, baseProps({ decisao: decisaoAdicionar, selecionados: new Set(['se1']), onAdicionarSelecionados })),
      );
    });
    const btn = pressableWithText(renderer, 'sessao.decisao.adicionarBtn')!;
    await act(async () => { (btn.props as { onPress: () => void }).onPress(); });
    expect(onAdicionarSelecionados).toHaveBeenCalledTimes(1);
  });

  it('calls onIgnorar when "manter" is pressed', async () => {
    const onIgnorar = vi.fn();
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(SessaoDecisaoScreen, baseProps({ decisao: decisaoAdicionar, onIgnorar })),
      );
    });
    const btn = pressableWithText(renderer, 'sessao.decisao.manterBtn')!;
    await act(async () => { (btn.props as { onPress: () => void }).onPress(); });
    expect(onIgnorar).toHaveBeenCalledTimes(1);
  });
});
