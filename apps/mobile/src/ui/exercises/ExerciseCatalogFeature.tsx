import { useState } from 'react';

import type { GetHistoricoExercicioUseCase } from '../../application/historico/use-cases/GetHistoricoExercicioUseCase';
import type { AppLogger } from '../../infrastructure/logging/AppLogger';
import type { HistoricoExercicioControllerDependencies } from '../historico/hooks/useHistoricoExercicioController';
import { useHistoricoExercicioController } from '../historico/hooks/useHistoricoExercicioController';
import { HistoricoExercicioScreen } from '../historico/screens/HistoricoExercicioScreen';
import type { ExerciseCatalogControllerDependencies } from './hooks/useExerciseCatalogController';
import { useExerciseCatalogController } from './hooks/useExerciseCatalogController';
import { ExerciseCatalogScreen } from './screens/ExerciseCatalogScreen';

export interface ExerciseCatalogFeatureDependencies extends ExerciseCatalogControllerDependencies {
  getHistoricoExercicio: GetHistoricoExercicioUseCase;
}

interface ExerciseCatalogFeatureProps {
  dependencies: ExerciseCatalogFeatureDependencies;
}

interface HistoricoTarget {
  id: string;
  nome: string;
}

export function ExerciseCatalogFeature({ dependencies }: ExerciseCatalogFeatureProps) {
  const [historicoTarget, setHistoricoTarget] = useState<HistoricoTarget | null>(null);

  const catalogController = useExerciseCatalogController(
    dependencies,
    (id, nome) => setHistoricoTarget({ id, nome })
  );

  if (historicoTarget) {
    return (
      <HistoricoView
        target={historicoTarget}
        dependencies={{
          getHistoricoExercicio: dependencies.getHistoricoExercicio,
          logger: dependencies.logger,
        }}
        onBack={() => setHistoricoTarget(null)}
      />
    );
  }

  return <ExerciseCatalogScreen {...catalogController} />;
}

interface HistoricoViewProps {
  target: HistoricoTarget;
  dependencies: HistoricoExercicioControllerDependencies;
  onBack: () => void;
}

function HistoricoView({ target, dependencies, onBack }: HistoricoViewProps) {
  const controller = useHistoricoExercicioController(target.id, target.nome, dependencies, onBack);
  return <HistoricoExercicioScreen {...controller} />;
}
