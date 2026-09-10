import { useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';

import type { TreinoPrimitives } from '../../domain/treinos/entities/Treino';
import { useTabActive } from '../shared/tabActivity';

import type { PlanoControllerDependencies } from './hooks/usePlanoController';
import { usePlanoController } from './hooks/usePlanoController';
import type { TreinoDetailControllerDependencies } from './hooks/useTreinoDetailController';
import { useTreinoDetailController } from './hooks/useTreinoDetailController';
import type { TreinoListControllerDependencies } from './hooks/useTreinoListController';
import { useTreinoListController } from './hooks/useTreinoListController';
import { TreinoDetailScreen } from './screens/TreinoDetailScreen';
import { TreinoListScreen } from './screens/TreinoListScreen';

export interface TreinoFeatureDependencies {
  list: TreinoListControllerDependencies;
  detail: TreinoDetailControllerDependencies;
  plano: PlanoControllerDependencies;
}

interface Props {
  dependencies: TreinoFeatureDependencies;
  onGoToSessao: () => void;
}

export function TreinoFeature({ dependencies, onGoToSessao }: Props) {
  const [selectedTreino, setSelectedTreino] = useState<TreinoPrimitives | null>(null);

  // Race P3 (rodada 3): criar treino e trocar de aba durante o submit fazia a
  // aba escondida (keep-alive) navegar sozinha para o editor — ao voltar, o
  // usuário caía no detalhe sem ter pedido. Só navega se a aba está visível.
  const isTabActive = useTabActive();
  const isTabActiveRef = useRef(isTabActive);
  useEffect(() => { isTabActiveRef.current = isTabActive; }, [isTabActive]);
  const selectTreinoSeVisivel = (treino: TreinoPrimitives) => {
    if (isTabActiveRef.current) setSelectedTreino(treino);
  };

  const planoController = usePlanoController(dependencies.plano);
  const listController = useTreinoListController(dependencies.list, selectTreinoSeVisivel, planoController.reload);

  // Closing the detail view (back button, hardware back, or after saving) returns to the
  // list. Reload so edits made in the detail screen are reflected instead of showing stale data.
  const closeDetail = () => {
    setSelectedTreino(null);
    void listController.reload();
    void planoController.reload();
  };

  useEffect(() => {
    if (!selectedTreino) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeDetail();
      return true;
    });
    return () => sub.remove();
  }, [selectedTreino]);

  if (selectedTreino) {
    return (
      <TreinoDetailView
        treino={selectedTreino}
        dependencies={dependencies.detail}
        onBack={closeDetail}
        onGoToSessao={onGoToSessao}
      />
    );
  }

  return <TreinoListScreen {...listController} plano={planoController} />;
}

interface TreinoDetailViewProps {
  treino: TreinoPrimitives;
  dependencies: TreinoDetailControllerDependencies;
  onBack: () => void;
  onGoToSessao: () => void;
}

function TreinoDetailView({ treino, dependencies, onBack, onGoToSessao }: TreinoDetailViewProps) {
  const controller = useTreinoDetailController(treino, dependencies, onBack, onGoToSessao);
  return <TreinoDetailScreen {...controller} />;
}
