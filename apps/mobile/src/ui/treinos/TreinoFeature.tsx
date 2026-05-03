import { useState } from 'react';

import type { TreinoPrimitives } from '../../domain/treinos/entities/Treino';
import type { TreinoDetailControllerDependencies } from './hooks/useTreinoDetailController';
import { useTreinoDetailController } from './hooks/useTreinoDetailController';
import type { TreinoListControllerDependencies } from './hooks/useTreinoListController';
import { useTreinoListController } from './hooks/useTreinoListController';
import { TreinoDetailScreen } from './screens/TreinoDetailScreen';
import { TreinoListScreen } from './screens/TreinoListScreen';

export interface TreinoFeatureDependencies {
  list: TreinoListControllerDependencies;
  detail: TreinoDetailControllerDependencies;
}

interface Props {
  dependencies: TreinoFeatureDependencies;
}

export function TreinoFeature({ dependencies }: Props) {
  const [selectedTreino, setSelectedTreino] = useState<TreinoPrimitives | null>(null);

  const listController = useTreinoListController(dependencies.list, setSelectedTreino);

  if (selectedTreino) {
    return (
      <TreinoDetailView
        treino={selectedTreino}
        dependencies={dependencies.detail}
        onBack={() => setSelectedTreino(null)}
      />
    );
  }

  return <TreinoListScreen {...listController} />;
}

interface TreinoDetailViewProps {
  treino: TreinoPrimitives;
  dependencies: TreinoDetailControllerDependencies;
  onBack: () => void;
}

function TreinoDetailView({ treino, dependencies, onBack }: TreinoDetailViewProps) {
  const controller = useTreinoDetailController(treino, dependencies, onBack);
  return <TreinoDetailScreen {...controller} />;
}
