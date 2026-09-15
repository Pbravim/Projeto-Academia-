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

const modalProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }));
vi.mock('../components/EscolherExercicioModal', () => ({
  EscolherExercicioModal: (props: Record<string, unknown>) => {
    modalProps.current = props;
    return null;
  },
}));

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
  it('etapa entrada: renderiza o textarea e os botoes de escolher arquivo / analisar, e chama os handlers ao tocar', async () => {
    const escolherArquivo = vi.fn();
    const analisar = vi.fn();
    const renderer = await render(createElement(ImportarTreinoScreen, baseProps({ escolherArquivo, analisar })));

    expect(renderer.root.findAllByType('TextInput')).toHaveLength(1);
    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('treinos.importar.escolherArquivo');
    expect(texts).toContain('treinos.importar.analisar');

    const [, escolherBtn, analisarBtn] = renderer.root.findAllByType('Pressable');
    await act(async () => { escolherBtn!.props.onPress(); });
    await act(async () => { analisarBtn!.props.onPress(); });

    expect(escolherArquivo).toHaveBeenCalledTimes(1);
    expect(analisar).toHaveBeenCalledTimes(1);
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

  it('etapa revisao: Salvar habilita quando podeSalvar e verdadeiro, e chama salvar ao tocar', async () => {
    const salvar = vi.fn();
    const itens: ItemRevisao[] = [
      { item: { nome: 'Supino', metodo: 'normal' }, status: 'casado', exercicioId: 'ex-1', candidatos: [] },
    ];
    const renderer = await render(
      createElement(ImportarTreinoScreen, baseProps({ etapa: 'revisao', itens, podeSalvar: true, salvar }))
    );

    const disabledButtons = renderer.root.findAllByType('Pressable').filter((n) => n.props.disabled === true);
    expect(disabledButtons).toHaveLength(0);

    const salvarBtn = renderer.root.findAllByType('Pressable').at(-1)!;
    await act(async () => { salvarBtn.props.onPress(); });
    expect(salvar).toHaveBeenCalledTimes(1);
  });

  it('etapa revisao: item resolvido mostra o nome do catalogo; "trocar"/"escolher no catalogo" abre o modal', async () => {
    const catalogo = [{ id: 'ex-1', name: 'Supino reto' } as never];
    const itens: ItemRevisao[] = [
      { item: { nome: 'Supino', metodo: 'normal' }, status: 'casado', exercicioId: 'ex-1', candidatos: [] },
    ];
    const renderer = await render(
      createElement(ImportarTreinoScreen, baseProps({ etapa: 'revisao', itens, catalogo, podeSalvar: true }))
    );

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('Supino reto');
    expect(modalProps.current!.visible).toBe(false);

    const trocarBtn = renderer.root
      .findAllByType('Pressable')
      .find((n) => n.findAllByType('Text').some((t2) => t2.props.children === 'treinos.importar.trocar'))!;
    await act(async () => { trocarBtn.props.onPress(); });

    expect(modalProps.current!.visible).toBe(true);
  });

  it('etapa revisao: onSelect/onCriarCustom/onClose do modal resolvem o item e fecham o picker', async () => {
    const resolverItem = vi.fn();
    const criarCustom = vi.fn();
    const itens: ItemRevisao[] = [
      { item: { nome: 'Agachamento', metodo: 'normal' }, status: 'nao_casado', exercicioId: null, candidatos: [] },
    ];
    const renderer = await render(
      createElement(ImportarTreinoScreen, baseProps({ etapa: 'revisao', itens, resolverItem, criarCustom }))
    );

    const abrirBtn = renderer.root
      .findAllByType('Pressable')
      .find((n) => n.findAllByType('Text').some((t2) => t2.props.children === 'treinos.importar.escolherNoCatalogo'))!;
    await act(async () => { abrirBtn.props.onPress(); });

    await act(async () => { (modalProps.current!.onSelect as (id: string) => void)('ex-novo'); });
    expect(resolverItem).toHaveBeenCalledWith(0, 'ex-novo');
    expect(modalProps.current!.visible).toBe(false);

    await act(async () => { abrirBtn.props.onPress(); });
    await act(async () => {
      (modalProps.current!.onCriarCustom as (input: unknown) => void)({ nome: 'X', groupMuscles: ['Peito'], category: '' });
    });
    expect(criarCustom).toHaveBeenCalledWith(0, { nome: 'X', groupMuscles: ['Peito'], category: '' });
    expect(modalProps.current!.visible).toBe(false);

    await act(async () => { abrirBtn.props.onPress(); });
    await act(async () => { (modalProps.current!.onClose as () => void)(); });
    expect(modalProps.current!.visible).toBe(false);
  });
});
