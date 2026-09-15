import { createElement } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { TreinoFeature, type TreinoFeatureDependencies } from './TreinoFeature';

/**
 * Smoke test da navegacao "importando" (novo nesta fatia): lista -> tela de
 * importacao -> onImportado volta pra lista, recarrega e seleciona o treino
 * (guard da race P3 via selectTreinoSeVisivel). O resto do TreinoFeature
 * (selecao de treino existente, back handler do detalhe) e regressao sem
 * teste dedicado.
 */

const hooks = vi.hoisted(() => ({
  reloadList: vi.fn(),
  reloadPlano: vi.fn(),
  onImportadoCaptured: null as ((treino: unknown) => void) | null,
  onSelectTreinoCaptured: null as ((treino: unknown) => void) | null,
  backHandlerListener: null as (() => boolean) | null,
}));

vi.mock('react-native', () => ({
  BackHandler: {
    addEventListener: (_event: string, listener: () => boolean) => {
      hooks.backHandlerListener = listener;
      return { remove: () => { hooks.backHandlerListener = null; } };
    },
  },
}));

vi.mock('./hooks/usePlanoController', () => ({
  usePlanoController: () => ({ plano: {}, isLoading: false, errorMessage: null, diaSelecionado: null, onSelectDia: vi.fn(), onSetTreino: vi.fn(), onClosePicker: vi.fn(), reload: hooks.reloadPlano }),
}));

vi.mock('./hooks/useTreinoListController', () => ({
  useTreinoListController: (_deps: unknown, onSelectTreino: (treino: unknown) => void) => {
    hooks.onSelectTreinoCaptured = onSelectTreino;
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
      onSubmit: vi.fn(),
      onDelete: vi.fn(),
      onDuplicate: vi.fn(),
      onSelectTreino: vi.fn(),
      reload: hooks.reloadList,
    };
  },
}));

vi.mock('./hooks/useTreinoDetailController', () => ({
  useTreinoDetailController: () => ({}),
}));

vi.mock('./hooks/useImportarTreinoController', () => ({
  useImportarTreinoController: (_deps: unknown, onImportado: (treino: unknown) => void) => {
    hooks.onImportadoCaptured = onImportado;
    return {};
  },
}));

vi.mock('./screens/TreinoListScreen', () => ({
  TreinoListScreen: (props: { onImportar: () => void }) =>
    createElement('Pressable', { testID: 'ir-importar', onPress: props.onImportar }),
}));

vi.mock('./screens/TreinoDetailScreen', () => ({ TreinoDetailScreen: () => null }));

vi.mock('./screens/ImportarTreinoScreen', () => ({
  ImportarTreinoScreen: (props: { onCancelar: () => void }) =>
    createElement('Pressable', { testID: 'cancelar-importar', onPress: props.onCancelar }),
}));

async function render(el: ReturnType<typeof createElement>): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(el); });
  return renderer;
}

function makeDependencies(): TreinoFeatureDependencies {
  return {
    list: {} as never,
    detail: {} as never,
    plano: {} as never,
  };
}

describe('TreinoFeature — navegacao de importacao', () => {
  it('onImportar troca para ImportarTreinoScreen; onCancelar volta pra lista', async () => {
    const renderer = await render(
      createElement(TreinoFeature, { dependencies: makeDependencies(), onGoToSessao: vi.fn() })
    );

    const irImportar = renderer.root.find((n) => n.props.testID === 'ir-importar');
    await act(async () => { irImportar.props.onPress(); });

    expect(renderer.root.findAll((n) => n.props.testID === 'cancelar-importar')).toHaveLength(1);

    const cancelar = renderer.root.find((n) => n.props.testID === 'cancelar-importar');
    await act(async () => { cancelar.props.onPress(); });

    expect(renderer.root.findAll((n) => n.props.testID === 'ir-importar')).toHaveLength(1);
  });

  it('onImportado fecha a importacao e recarrega lista/plano', async () => {
    hooks.reloadList.mockClear();
    hooks.reloadPlano.mockClear();
    const renderer = await render(
      createElement(TreinoFeature, { dependencies: makeDependencies(), onGoToSessao: vi.fn() })
    );

    const irImportar = renderer.root.find((n) => n.props.testID === 'ir-importar');
    await act(async () => { irImportar.props.onPress(); });

    expect(hooks.onImportadoCaptured).not.toBeNull();
    await act(async () => {
      hooks.onImportadoCaptured!({ id: 't1', name: 'Novo treino', objetivo: null, createdAt: 'x', updatedAt: 'x' });
    });

    expect(hooks.reloadList).toHaveBeenCalledTimes(1);
    expect(hooks.reloadPlano).toHaveBeenCalledTimes(1);
    // selectTreinoSeVisivel troca pra o detalhe do treino importado (guard P3) — a importacao fecha.
    expect(renderer.root.findAll((n) => n.props.testID === 'cancelar-importar')).toHaveLength(0);
  });

  it('hardware back durante a importacao fecha a tela de importacao', async () => {
    const renderer = await render(
      createElement(TreinoFeature, { dependencies: makeDependencies(), onGoToSessao: vi.fn() })
    );

    const irImportar = renderer.root.find((n) => n.props.testID === 'ir-importar');
    await act(async () => { irImportar.props.onPress(); });
    expect(hooks.backHandlerListener).not.toBeNull();

    await act(async () => { hooks.backHandlerListener!(); });

    expect(renderer.root.findAll((n) => n.props.testID === 'ir-importar')).toHaveLength(1);
  });

  it('hardware back com um treino selecionado fecha o detalhe (closeDetail) e recarrega', async () => {
    hooks.reloadList.mockClear();
    hooks.reloadPlano.mockClear();
    const renderer = await render(
      createElement(TreinoFeature, { dependencies: makeDependencies(), onGoToSessao: vi.fn() })
    );

    expect(hooks.onSelectTreinoCaptured).not.toBeNull();
    await act(async () => {
      hooks.onSelectTreinoCaptured!({ id: 't1', name: 'Treino A', objetivo: null, createdAt: 'x', updatedAt: 'x' });
    });
    expect(hooks.backHandlerListener).not.toBeNull();

    await act(async () => { hooks.backHandlerListener!(); });

    expect(hooks.reloadList).toHaveBeenCalledTimes(1);
    expect(hooks.reloadPlano).toHaveBeenCalledTimes(1);
    expect(renderer.root.findAll((n) => n.props.testID === 'ir-importar')).toHaveLength(1);
  });
});
