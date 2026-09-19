import { useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';

import type { TreinoPrimitives } from '../../domain/treinos/entities/Treino';
import { useTabActive } from '../shared/tabActivity';

import type { UseImportarTreinoControllerDependencies } from './hooks/useImportarTreinoController';
import { useImportarTreinoController } from './hooks/useImportarTreinoController';
import type { PlanoControllerDependencies } from './hooks/usePlanoController';
import { usePlanoController } from './hooks/usePlanoController';
import type { TreinoDetailControllerDependencies } from './hooks/useTreinoDetailController';
import { useTreinoDetailController } from './hooks/useTreinoDetailController';
import type { TreinoListControllerDependencies } from './hooks/useTreinoListController';
import { useTreinoListController } from './hooks/useTreinoListController';
import { ImportarTreinoScreen } from './screens/ImportarTreinoScreen';
import { TreinoDetailScreen } from './screens/TreinoDetailScreen';
import { TreinoListScreen } from './screens/TreinoListScreen';

export interface TreinoFeatureDependencies {
  list: TreinoListControllerDependencies & UseImportarTreinoControllerDependencies;
  detail: TreinoDetailControllerDependencies;
  plano: PlanoControllerDependencies;
}

interface Props {
  dependencies: TreinoFeatureDependencies;
  onGoToSessao: () => void;
}

export function TreinoFeature({ dependencies, onGoToSessao }: Props) {
  const [selectedTreino, setSelectedTreino] = useState<TreinoPrimitives | null>(null);
  const [importando, setImportando] = useState(false);

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

  const onImportado = (treino: TreinoPrimitives) => {
    setImportando(false);
    void listController.reload();
    void planoController.reload();
    selectTreinoSeVisivel(treino);
  };

  useEffect(() => {
    if (!selectedTreino && !importando) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (importando) {
        setImportando(false);
      } else {
        closeDetail();
      }
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- closeDetail é recriada a cada render; o listener deve ser (re)registrado só quando o treino selecionado/importando muda
  }, [selectedTreino, importando]);

  if (importando) {
    return (
      <ImportarTreinoView
        dependencies={dependencies.list}
        onImportado={onImportado}
        onCancelar={() => setImportando(false)}
      />
    );
  }

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

  return <TreinoListScreen {...listController} plano={planoController} onImportar={() => setImportando(true)} />;
}

interface ImportarTreinoViewProps {
  dependencies: UseImportarTreinoControllerDependencies;
  onImportado: (treino: TreinoPrimitives) => void;
  onCancelar: () => void;
}

function ImportarTreinoView({ dependencies, onImportado, onCancelar }: ImportarTreinoViewProps) {
  const controller = useImportarTreinoController(dependencies, onImportado);
  return <ImportarTreinoScreen {...controller} onCancelar={onCancelar} />;
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
