import { createElement, type ReactNode, type Ref } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlanoSemanal } from '../../../domain/plano/repositories/PlanoSemanalRepository';
import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import type { PlanoControllerState } from '../hooks/usePlanoController';
import type { TreinoListControllerState } from '../hooks/useTreinoListController';
import { buildTreinoListViewModel } from '../presenters/buildTreinoListViewModel';

import { TreinoListScreen } from './TreinoListScreen';

/**
 * Fluxos do TreinoListScreen (61c) — o smoke de 38b (TreinoListScreen.test.tsx)
 * cobre só o botão "Importar treino"; este arquivo cobre os demais fluxos da
 * tabela §4.2 do plano. D1: PlanoPickerModal/PlanoSemanalCard são stubs que
 * repassam props (não estão no relatório de cobertura); ConfirmDialog é real.
 */

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode),
);

const focusSpy = vi.hoisted(() => vi.fn());

vi.mock('react-native', async () => {
  const react = await import('react');
  return {
    ActivityIndicator: host('ActivityIndicator'),
    Modal: (props: Record<string, unknown>) =>
      props.visible ? createElement('View', {}, props.children as ReactNode) : null,
    Pressable: host('Pressable'),
    ScrollView: host('ScrollView'),
    Text: host('Text'),
    TextInput: react.forwardRef((props: Record<string, unknown>, ref: Ref<unknown>) => {
      react.useImperativeHandle(ref, () => ({ focus: focusSpy }));
      return createElement('TextInput', props);
    }),
    View: host('View'),
    StyleSheet: { create: (s: unknown) => s },
  };
});

vi.mock('../components/PlanoPickerModal', () => ({
  PlanoPickerModal: (props: Record<string, unknown>) => createElement('PlanoPickerModal', props),
}));
vi.mock('../components/PlanoSemanalCard', () => ({
  PlanoSemanalCard: (props: Record<string, unknown>) => createElement('PlanoSemanalCard', props),
}));

vi.mock('../../shared/i18n', () => ({
  useLocale: () => 'pt-BR',
  useT: () => (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key),
}));

vi.mock('../../shared/theme', async () => {
  const react = await import('react');
  const colors = new Proxy({}, { get: (_t, prop) => String(prop) });
  return { ThemeContext: react.createContext(colors), useTheme: () => colors };
});

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
  // Prefere Pressables com accessibilityRole="button": o card do treino
  // (sem role) envolve os botões de ação e "vazaria" como primeiro match se
  // a busca não priorizasse os botões de verdade.
  const button = renderer.root
    .findAll((node) => node.type === 'Pressable' && node.props.accessibilityRole === 'button')
    .find((p) => extractText(p.props.children).includes(text));
  if (button) return button;
  return renderer.root
    .findAll((node) => node.type === 'Pressable')
    .find((p) => extractText(p.props.children).includes(text));
}

function hasNestedPressable(node: { children: unknown[] }): boolean {
  return node.children.some((child) => {
    if (typeof child === 'string') return false;
    const instance = child as { type: unknown; children: unknown[] };
    if (instance.type === 'Pressable') return true;
    return hasNestedPressable(instance);
  });
}

/** Só os Pressables "folha" (sem outro Pressable aninhado) com o texto — evita
 * casar com wrappers (card, overlay) cujo texto extraído inclui o do filho. */
function leafPressablesWithText(renderer: ReactTestRenderer, text: string) {
  return renderer.root
    .findAll((node) => node.type === 'Pressable')
    .filter((p) => extractText(p.props.children).includes(text))
    .filter((p) => !hasNestedPressable(p));
}

function textInputWithPlaceholder(renderer: ReactTestRenderer, placeholder: string) {
  return renderer.root
    .findAllByType('TextInput' as never)
    .find((n) => (n.props as { placeholder?: string }).placeholder === placeholder)!;
}

async function render(el: ReturnType<typeof createElement>): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(el);
  });
  return renderer;
}

function treino(id: string, name: string, objetivo: string | null = null): TreinoPrimitives {
  return { id, name, objetivo, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' };
}

const emptyPlanoSemanal: PlanoSemanal = { seg: null, ter: null, qua: null, qui: null, sex: null, sab: null, dom: null };

function planoState(overrides: Partial<PlanoControllerState> = {}): PlanoControllerState {
  return {
    plano: emptyPlanoSemanal,
    diaSelecionado: null,
    isLoading: false,
    errorMessage: null,
    onSelectDia: vi.fn(),
    onSetTreino: vi.fn(),
    onClosePicker: vi.fn(),
    reload: vi.fn(),
    ...overrides,
  };
}

type ScreenProps = TreinoListControllerState & { plano: PlanoControllerState; onImportar: () => void };

function baseProps(overrides: Partial<ScreenProps> = {}): ScreenProps {
  return {
    draft: { name: '', objetivo: '' },
    treinos: [],
    treinosVazios: new Set(),
    errorMessage: null,
    feedbackMessage: null,
    isLoading: false,
    isSubmitting: false,
    deletingId: null,
    duplicandoId: null,
    onChangeField: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    onDuplicate: vi.fn().mockResolvedValue(undefined),
    onSelectTreino: vi.fn(),
    reload: vi.fn(),
    plano: planoState(),
    onImportar: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  focusSpy.mockClear();
});

describe('TreinoListScreen — lista vazia', () => {
  it('mostra titulo, CTA e o card "crie o primeiro treino"; a CTA foca o input do nome', async () => {
    const renderer = await render(createElement(TreinoListScreen, baseProps()));
    const texts = renderer.root.findAllByType('Text' as never).map((n) => extractText(n.props.children));
    expect(texts).toContain('treinos.list.emptyStateTitle');
    expect(texts).toContain('treinos.list.criePrimeiroTreino');

    const cta = pressableWithText(renderer, 'treinos.list.emptyStateCta')!;
    await act(async () => {
      (cta.props as { onPress: () => void }).onPress();
    });
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('com isLoading esconde o empty state do topo e mostra o indicador com cor accent', async () => {
    const renderer = await render(createElement(TreinoListScreen, baseProps({ isLoading: true })));
    const texts = renderer.root.findAllByType('Text' as never).map((n) => extractText(n.props.children));
    expect(texts).not.toContain('treinos.list.emptyStateTitle');

    const indicator = renderer.root.findByType('ActivityIndicator' as never);
    expect(indicator.props.color).toBe('accent');
  });
});

describe('TreinoListScreen — com treinos', () => {
  it('renderiza titulo e subtitulo de cada card e oculta o "crie o primeiro treino"', async () => {
    const treinos = [treino('t1', 'Peito', 'Força'), treino('t2', 'Costas', null)];
    const renderer = await render(createElement(TreinoListScreen, baseProps({ treinos })));
    const vm = buildTreinoListViewModel(treinos, 'pt-BR');
    const texts = renderer.root.findAllByType('Text' as never).map((n) => extractText(n.props.children));

    for (const card of vm.cards) {
      expect(texts).toContain(card.title);
      expect(texts).toContain(card.subtitle);
    }
    expect(texts).not.toContain('treinos.list.criePrimeiroTreino');
  });
});

describe('TreinoListScreen — criar', () => {
  it('digitar no campo nome chama onChangeField("name", valor)', async () => {
    const onChangeField = vi.fn();
    const renderer = await render(createElement(TreinoListScreen, baseProps({ onChangeField })));
    const nameInput = textInputWithPlaceholder(renderer, 'treinos.list.namePlaceholder');
    await act(async () => {
      nameInput.props.onChangeText('Peito');
    });
    expect(onChangeField).toHaveBeenCalledWith('name', 'Peito');
  });

  it('botao criar fica desabilitado com nome vazio/whitespace e durante o submit', async () => {
    let renderer = await render(
      createElement(TreinoListScreen, baseProps({ draft: { name: '   ', objetivo: '' } })),
    );
    let btn = pressableWithText(renderer, 'treinos.list.criarTreino')!;
    expect(btn.props.disabled).toBe(true);

    renderer = await render(
      createElement(
        TreinoListScreen,
        baseProps({ draft: { name: 'Peito', objetivo: '' }, isSubmitting: true }),
      ),
    );
    btn = pressableWithText(renderer, 'treinos.list.criando')!;
    expect(btn.props.disabled).toBe(true);
  });

  it('press no botao criar chama onSubmit quando o nome e valido', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const renderer = await render(
      createElement(TreinoListScreen, baseProps({ draft: { name: 'Peito', objetivo: '' }, onSubmit })),
    );
    const btn = pressableWithText(renderer, 'treinos.list.criarTreino')!;
    await act(async () => {
      (btn.props as { onPress: () => void }).onPress();
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('onSubmitEditing do campo nome so chama onSubmit se puder submeter', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    let renderer = await render(
      createElement(TreinoListScreen, baseProps({ draft: { name: '', objetivo: '' }, onSubmit })),
    );
    let nameInput = textInputWithPlaceholder(renderer, 'treinos.list.namePlaceholder');
    await act(async () => {
      nameInput.props.onSubmitEditing();
    });
    expect(onSubmit).not.toHaveBeenCalled();

    renderer = await render(
      createElement(TreinoListScreen, baseProps({ draft: { name: 'Peito', objetivo: '' }, onSubmit })),
    );
    nameInput = textInputWithPlaceholder(renderer, 'treinos.list.namePlaceholder');
    await act(async () => {
      nameInput.props.onSubmitEditing();
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe('TreinoListScreen — objetivo (ObjetivoPicker)', () => {
  it('o trigger abre o sheet e escolher uma opcao chama onChangeField', async () => {
    const onChangeField = vi.fn();
    const renderer = await render(createElement(TreinoListScreen, baseProps({ onChangeField })));
    const trigger = pressableWithText(renderer, 'treinos.list.objetivoPicker.selecionar')!;
    await act(async () => {
      (trigger.props as { onPress: () => void }).onPress();
    });

    const opt = pressableWithText(renderer, 'treinos.list.objetivoPicker.options.forca')!;
    await act(async () => {
      (opt.props as { onPress: () => void }).onPress();
    });
    expect(onChangeField).toHaveBeenCalledWith('objetivo', 'treinos.list.objetivoPicker.options.forca');

    // Sheet fecha apos escolher a opcao (achado 2, sev2 — mata M8).
    const optAfterSelect = pressableWithText(renderer, 'treinos.list.objetivoPicker.options.forca');
    expect(optAfterSelect).toBeUndefined();
  });

  it('custom: digitar com espacos + OK chama onChangeField ja aparado e limpa o input', async () => {
    const onChangeField = vi.fn();
    const renderer = await render(createElement(TreinoListScreen, baseProps({ onChangeField })));
    const trigger = pressableWithText(renderer, 'treinos.list.objetivoPicker.selecionar')!;
    await act(async () => {
      (trigger.props as { onPress: () => void }).onPress();
    });

    const customInput = textInputWithPlaceholder(renderer, 'treinos.objetivo.digitePlaceholder');
    await act(async () => {
      customInput.props.onChangeText('  X ');
    });
    const okBtn = pressableWithText(renderer, 'common.ok')!;
    await act(async () => {
      (okBtn.props as { onPress: () => void }).onPress();
    });
    expect(onChangeField).toHaveBeenCalledWith('objetivo', 'X');

    // Sheet fecha apos confirmar o custom (achado 2, sev2 — mata M10).
    const okBtnAfterConfirm = pressableWithText(renderer, 'common.ok');
    expect(okBtnAfterConfirm).toBeUndefined();

    // Reabre o sheet (mesmo trigger, agora exibindo "X") para provar que o
    // input customizado voltou a ficar vazio (achado 1, sev2).
    await act(async () => {
      (trigger.props as { onPress: () => void }).onPress();
    });
    const customInputReopened = textInputWithPlaceholder(renderer, 'treinos.objetivo.digitePlaceholder');
    expect(customInputReopened.props.value).toBe('');
  });

  it('custom vazio nao chama onChangeField', async () => {
    const onChangeField = vi.fn();
    const renderer = await render(createElement(TreinoListScreen, baseProps({ onChangeField })));
    const trigger = pressableWithText(renderer, 'treinos.list.objetivoPicker.selecionar')!;
    await act(async () => {
      (trigger.props as { onPress: () => void }).onPress();
    });
    const okBtn = pressableWithText(renderer, 'common.ok')!;
    await act(async () => {
      (okBtn.props as { onPress: () => void }).onPress();
    });
    expect(onChangeField).not.toHaveBeenCalled();
  });

  it('com isSubmitting (editable=false) o trigger nao abre o sheet', async () => {
    const renderer = await render(createElement(TreinoListScreen, baseProps({ isSubmitting: true })));
    const trigger = pressableWithText(renderer, 'treinos.list.objetivoPicker.selecionar')!;
    await act(async () => {
      (trigger.props as { onPress: () => void }).onPress();
    });
    const opt = pressableWithText(renderer, 'treinos.list.objetivoPicker.options.forca');
    expect(opt).toBeUndefined();
  });

  it('sheet aberto que perde editable (isSubmitting inicia) nao seleciona mais', async () => {
    const onChangeField = vi.fn();
    const props = baseProps({ onChangeField });
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(TreinoListScreen, props));
    });
    const trigger = pressableWithText(renderer, 'treinos.list.objetivoPicker.selecionar')!;
    await act(async () => {
      (trigger.props as { onPress: () => void }).onPress();
    });

    await act(async () => {
      renderer.update(createElement(TreinoListScreen, { ...props, isSubmitting: true }));
    });

    const opt = pressableWithText(renderer, 'treinos.list.objetivoPicker.options.forca')!;
    await act(async () => {
      (opt.props as { onPress: () => void }).onPress();
    });
    expect(onChangeField).not.toHaveBeenCalled();
  });

  it('objetivo "__outro__" mostra o placeholder de selecionar em vez do valor cru', async () => {
    const renderer = await render(
      createElement(TreinoListScreen, baseProps({ draft: { name: '', objetivo: '__outro__' } })),
    );
    const trigger = pressableWithText(renderer, 'treinos.list.objetivoPicker.selecionar');
    expect(trigger).toBeDefined();
    const texts = renderer.root.findAllByType('Text' as never).map((n) => extractText(n.props.children));
    expect(texts).not.toContain('__outro__');
  });

  it('valor customizado aparece marcado com check no sheet', async () => {
    const renderer = await render(
      createElement(TreinoListScreen, baseProps({ draft: { name: '', objetivo: 'Personalizado' } })),
    );
    const trigger = pressableWithText(renderer, 'Personalizado')!;
    await act(async () => {
      (trigger.props as { onPress: () => void }).onPress();
    });
    const texts = renderer.root.findAllByType('Text' as never).map((n) => extractText(n.props.children));
    expect(texts.filter((t) => t === 'Personalizado').length).toBeGreaterThanOrEqual(2);
    expect(texts).toContain('✓');
  });
});

describe('TreinoListScreen — abrir detalhe', () => {
  it('press no card chama onSelectTreino com o objeto original do treino', async () => {
    const t1 = treino('t1', 'Peito');
    const onSelectTreino = vi.fn();
    const renderer = await render(
      createElement(TreinoListScreen, baseProps({ treinos: [t1], onSelectTreino })),
    );
    const card = pressableWithText(renderer, 'Peito')!;
    await act(async () => {
      (card.props as { onPress: () => void }).onPress();
    });
    expect(onSelectTreino).toHaveBeenCalledTimes(1);
    expect(onSelectTreino.mock.calls[0][0]).toBe(t1);
  });
});

describe('TreinoListScreen — duplicar', () => {
  it('press no botao duplicar chama onDuplicate com o id do card', async () => {
    const onDuplicate = vi.fn().mockResolvedValue(undefined);
    const t1 = treino('t1', 'Peito');
    const renderer = await render(
      createElement(TreinoListScreen, baseProps({ treinos: [t1], onDuplicate })),
    );
    const dupBtn = pressableWithText(renderer, 'treinos.list.duplicar')!;
    await act(async () => {
      (dupBtn.props as { onPress: () => void }).onPress();
    });
    expect(onDuplicate).toHaveBeenCalledWith('t1');
  });

  it('duplicandoId mostra o texto/estilo de carregamento so no card afetado e desabilita os dois botoes de ambos os cards', async () => {
    // Fixture com 2 treinos (achado 3, sev2): com 1 so treino, "algum card"
    // e "este card" colapsam e a mutacao passa verde sem prender a regra.
    const t1 = treino('t1', 'Peito');
    const t2 = treino('t2', 'Costas');
    const renderer = await render(
      createElement(TreinoListScreen, baseProps({ treinos: [t1, t2], duplicandoId: 't1' })),
    );

    const duplicandoTexts = renderer.root
      .findAllByType('Text' as never)
      .filter((n) => extractText(n.props.children) === 'treinos.list.duplicando');
    expect(duplicandoTexts).toHaveLength(1);
    const duplicarTexts = renderer.root
      .findAllByType('Text' as never)
      .filter((n) => extractText(n.props.children) === 'treinos.list.duplicar');
    expect(duplicarTexts).toHaveLength(1);

    const loadingDup = pressableWithText(renderer, 'treinos.list.duplicando')!;
    expect(loadingDup.props.disabled).toBe(true);
    expect(loadingDup.props.style({ pressed: false })).toContainEqual({ opacity: 0.5 });

    const notLoadingDup = pressableWithText(renderer, 'treinos.list.duplicar')!;
    expect(notLoadingDup.props.style({ pressed: false })).not.toContainEqual({ opacity: 0.5 });

    const delBtns = leafPressablesWithText(renderer, 'common.delete');
    expect(delBtns).toHaveLength(2);
    expect(delBtns.every((b) => b.props.disabled)).toBe(true);
  });

  it('deletingId tambem desabilita o botao de duplicar', async () => {
    const t1 = treino('t1', 'Peito');
    const renderer = await render(
      createElement(TreinoListScreen, baseProps({ treinos: [t1], deletingId: 't1' })),
    );
    const dupBtn = pressableWithText(renderer, 'treinos.list.duplicar')!;
    expect(dupBtn.props.disabled).toBe(true);
  });
});

describe('TreinoListScreen — excluir com confirmação', () => {
  it('press em excluir nao chama onDelete direto; abre o ConfirmDialog; cancelar fecha sem chamar', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const t1 = treino('t1', 'Peito');
    const renderer = await render(
      createElement(TreinoListScreen, baseProps({ treinos: [t1], onDelete })),
    );

    const deleteBtn = pressableWithText(renderer, 'common.delete')!;
    await act(async () => {
      (deleteBtn.props as { onPress: () => void }).onPress();
    });
    expect(onDelete).not.toHaveBeenCalled();

    let texts = renderer.root.findAllByType('Text' as never).map((n) => extractText(n.props.children));
    expect(texts).toContain('treinos.list.confirmDeleteTitle');

    const cancelBtn = pressableWithText(renderer, 'common.back')!;
    await act(async () => {
      (cancelBtn.props as { onPress: () => void }).onPress();
    });
    expect(onDelete).not.toHaveBeenCalled();

    texts = renderer.root.findAllByType('Text' as never).map((n) => extractText(n.props.children));
    expect(texts).not.toContain('treinos.list.confirmDeleteTitle');
  });

  it('confirmar no ConfirmDialog chama onDelete uma vez e fecha o dialogo', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const t1 = treino('t1', 'Peito');
    const renderer = await render(
      createElement(TreinoListScreen, baseProps({ treinos: [t1], onDelete })),
    );

    const deleteBtn = pressableWithText(renderer, 'common.delete')!;
    await act(async () => {
      (deleteBtn.props as { onPress: () => void }).onPress();
    });

    // O botao "excluir" do card e o botao "confirmar" do dialogo tem o mesmo
    // texto (common.delete) — o dialogo aparece depois na arvore.
    const deleteTextButtons = leafPressablesWithText(renderer, 'common.delete');
    expect(deleteTextButtons.length).toBe(2);
    const confirmBtn = deleteTextButtons[1];
    await act(async () => {
      (confirmBtn.props as { onPress: () => void }).onPress();
    });
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith('t1');

    const texts = renderer.root.findAllByType('Text' as never).map((n) => extractText(n.props.children));
    expect(texts).not.toContain('treinos.list.confirmDeleteTitle');
  });

  it('deletingId mostra o texto de excluindo so no card afetado', async () => {
    // Fixture com 2 treinos (achado 3, sev2) — ver nota no teste de duplicar.
    const t1 = treino('t1', 'Peito');
    const t2 = treino('t2', 'Costas');
    const renderer = await render(
      createElement(TreinoListScreen, baseProps({ treinos: [t1, t2], deletingId: 't1' })),
    );
    const excluindoTexts = renderer.root
      .findAllByType('Text' as never)
      .filter((n) => extractText(n.props.children) === 'treinos.list.excluindo');
    expect(excluindoTexts).toHaveLength(1);
    const deleteTexts = renderer.root
      .findAllByType('Text' as never)
      .filter((n) => extractText(n.props.children) === 'common.delete');
    expect(deleteTexts).toHaveLength(1);
  });
});

describe('TreinoListScreen — erros', () => {
  it('mostra errorMessage, feedbackMessage e plano.errorMessage quando presentes', async () => {
    const renderer = await render(
      createElement(
        TreinoListScreen,
        baseProps({
          errorMessage: 'Erro genérico',
          feedbackMessage: 'Feito!',
          plano: planoState({ errorMessage: 'Erro do plano' }),
        }),
      ),
    );
    const texts = renderer.root.findAllByType('Text' as never).map((n) => extractText(n.props.children));
    expect(texts).toContain('Erro genérico');
    expect(texts).toContain('Feito!');
    expect(texts).toContain('Erro do plano');
  });
});

describe('TreinoListScreen — plano', () => {
  it('repassa plano, treinos, isLoading e onSelectDia para PlanoSemanalCard; onSelect para PlanoPickerModal', async () => {
    const treinos = [treino('t1', 'Peito')];
    const plano = planoState({
      plano: { ...emptyPlanoSemanal, seg: 't1' },
      diaSelecionado: 'seg',
    });
    const renderer = await render(createElement(TreinoListScreen, baseProps({ treinos, plano })));

    const planoCard = renderer.root.findByType('PlanoSemanalCard' as never);
    expect(planoCard.props.plano).toBe(plano.plano);
    expect(planoCard.props.treinos).toBe(treinos);
    expect(planoCard.props.isLoading).toBe(plano.isLoading);
    expect(planoCard.props.onSelectDia).toBe(plano.onSelectDia);

    const planoPicker = renderer.root.findByType('PlanoPickerModal' as never);
    expect(planoPicker.props.treinoAtualId).toBe('t1');
    expect(planoPicker.props.onSelect).toBe(plano.onSetTreino);
  });

  it('PlanoPickerModal recebe treinoAtualId null quando nao ha dia selecionado', async () => {
    const renderer = await render(createElement(TreinoListScreen, baseProps()));
    const planoPicker = renderer.root.findByType('PlanoPickerModal' as never);
    expect(planoPicker.props.treinoAtualId).toBeNull();
  });
});
