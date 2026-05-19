import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

import type { TreinoPrimitives } from '../../domain/treinos/entities/Treino';
import type { TreinoDetailControllerDependencies } from './hooks/useTreinoDetailController';
import { useTreinoDetailController } from './hooks/useTreinoDetailController';
import type { TreinoListControllerDependencies } from './hooks/useTreinoListController';
import { useTreinoListController } from './hooks/useTreinoListController';
import type { PlanoControllerDependencies } from './hooks/usePlanoController';
import { usePlanoController } from './hooks/usePlanoController';
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

  const listController = useTreinoListController(dependencies.list, setSelectedTreino);
  const planoController = usePlanoController(dependencies.plano);

  useEffect(() => {
    if (!selectedTreino) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedTreino(null);
      return true;
    });
    return () => sub.remove();
  }, [selectedTreino]);

  if (selectedTreino) {
    return (
      <TreinoDetailView
        treino={selectedTreino}
        dependencies={dependencies.detail}
        onBack={() => setSelectedTreino(null)}
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
