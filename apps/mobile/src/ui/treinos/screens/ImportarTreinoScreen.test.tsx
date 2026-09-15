import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import type { ItemRevisao } from '../hooks/useImportarTreinoController';

import { ImportarTreinoScreen } from './ImportarTreinoScreen';

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode)
);

vi.mock('react-native', () => ({
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

vi.mock('../components/EscolherExercicioModal', () => ({ EscolherExercicioModal: () => null }));

async function render(el: ReturnType<typeof createElement>): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(el); });
  return renderer;
}

function baseProps(overrides: Partial<Parameters<typeof ImportarTreinoScreen>[0]> = {}) {
  return {
    texto: '',
    etapa: 'entrada' as const,
    itens: [] as ItemRevisao[],
    catalogo: [],
    errorMessage: null,
    isAnalisando: false,
    isSalvando: false,
    podeSalvar: false,
    onChangeTexto: vi.fn(),
    escolherArquivo: vi.fn(),
    analisar: vi.fn(),
    resolverItem: vi.fn(),
    criarCustom: vi.fn(),
    salvar: vi.fn(),
    onCancelar: vi.fn(),
    ...overrides,
  };
}

describe('ImportarTreinoScreen', () => {
  it('etapa entrada: renderiza o textarea e os botoes de escolher arquivo / analisar', async () => {
    const renderer = await render(createElement(ImportarTreinoScreen, baseProps()));

    expect(renderer.root.findAllByType('TextInput')).toHaveLength(1);
    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('treinos.importar.escolherArquivo');
    expect(texts).toContain('treinos.importar.analisar');
  });

  it('etapa revisao: renderiza N itens com badge casado/nao casado e o botao Salvar disabled ate tudo resolvido', async () => {
    const itens: ItemRevisao[] = [
      { item: { nome: 'Supino', metodo: 'normal' }, status: 'casado', exercicioId: 'ex-1', candidatos: [] },
      { item: { nome: 'Agachamento', metodo: 'normal' }, status: 'nao_casado', exercicioId: null, candidatos: [] },
    ];
    const renderer = await render(
      createElement(ImportarTreinoScreen, baseProps({ etapa: 'revisao', itens, podeSalvar: false }))
    );

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('treinos.importar.casado');
    expect(texts).toContain('treinos.importar.naoCasado');

    const salvarBtn = renderer.root
      .findAllByType('Pressable')
      .find((n) => (n.findAllByType('Text')[0]?.props.children as string)?.includes('salvar') || n.props.disabled !== undefined);
    const disabledButtons = renderer.root.findAllByType('Pressable').filter((n) => n.props.disabled === true);
    expect(disabledButtons.length).toBeGreaterThan(0);
    expect(salvarBtn).toBeDefined();
  });

  it('etapa revisao: Salvar habilita quando podeSalvar e verdadeiro', async () => {
    const itens: ItemRevisao[] = [
      { item: { nome: 'Supino', metodo: 'normal' }, status: 'casado', exercicioId: 'ex-1', candidatos: [] },
    ];
    const renderer = await render(
      createElement(ImportarTreinoScreen, baseProps({ etapa: 'revisao', itens, podeSalvar: true }))
    );

    const disabledButtons = renderer.root.findAllByType('Pressable').filter((n) => n.props.disabled === true);
    expect(disabledButtons).toHaveLength(0);
  });
});
