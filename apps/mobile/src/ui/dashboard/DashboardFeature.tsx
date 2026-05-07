import { useState } from 'react';

import type { DashboardControllerDependencies } from './hooks/useDashboardController';
import type { TreinoEvolucaoControllerDeps } from './hooks/useTreinoEvolucaoController';
import { useDashboardController } from './hooks/useDashboardController';
import { useTreinoEvolucaoController } from './hooks/useTreinoEvolucaoController';
import { DashboardScreen } from './screens/DashboardScreen';
import { TreinoEvolucaoScreen } from './screens/TreinoEvolucaoScreen';

interface Props {
  dependencies: DashboardControllerDependencies & TreinoEvolucaoControllerDeps;
}

interface TreinoSelected {
  treinoId: string;
  treinoNome: string;
}

export function DashboardFeature({ dependencies }: Props) {
  const [selected, setSelected] = useState<TreinoSelected | null>(null);
  const controller = useDashboardController(dependencies);

  if (selected) {
    return (
      <TreinoEvolucaoView
        treinoId={selected.treinoId}
        treinoNome={selected.treinoNome}
        dependencies={dependencies}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <DashboardScreen
      {...controller}
      onVerEvolucao={(treinoId, treinoNome) => setSelected({ treinoId, treinoNome })}
    />
  );
}

function TreinoEvolucaoView({
  treinoId,
  treinoNome,
  dependencies,
  onBack,
}: {
  treinoId: string;
  treinoNome: string;
  dependencies: TreinoEvolucaoControllerDeps;
  onBack: () => void;
}) {
  const { exercicios, isLoading, errorMessage } = useTreinoEvolucaoController(treinoId, dependencies);
  return (
    <TreinoEvolucaoScreen
      treinoNome={treinoNome}
      exercicios={exercicios}
      isLoading={isLoading}
      errorMessage={errorMessage}
      onBack={onBack}
    />
  );
}
