import { useState } from 'react';

import type { DashboardControllerDependencies } from './hooks/useDashboardController';
import type { TreinoEvolucaoControllerDeps } from './hooks/useTreinoEvolucaoController';
import { useDashboardController } from './hooks/useDashboardController';
import { useTreinoEvolucaoController } from './hooks/useTreinoEvolucaoController';
import { DashboardScreen } from './screens/DashboardScreen';
import { RecordesPessoaisScreen } from './screens/RecordesPessoaisScreen';
import { TreinoEvolucaoScreen } from './screens/TreinoEvolucaoScreen';

interface Props {
  dependencies: DashboardControllerDependencies & TreinoEvolucaoControllerDeps;
}

interface TreinoSelected {
  treinoId: string;
  treinoNome: string;
}

type ActiveView = { type: 'dashboard' } | { type: 'recordes' } | { type: 'evolucao'; treinoId: string; treinoNome: string };

export function DashboardFeature({ dependencies }: Props) {
  const [view, setView] = useState<ActiveView>({ type: 'dashboard' });
  const controller = useDashboardController(dependencies);

  if (view.type === 'recordes') {
    return (
      <RecordesPessoaisScreen
        recordes={controller.stats?.recordesPessoais ?? []}
        onBack={() => setView({ type: 'dashboard' })}
      />
    );
  }

  if (view.type === 'evolucao') {
    return (
      <TreinoEvolucaoView
        treinoId={view.treinoId}
        treinoNome={view.treinoNome}
        dependencies={dependencies}
        onBack={() => setView({ type: 'dashboard' })}
      />
    );
  }

  return (
    <DashboardScreen
      {...controller}
      onVerEvolucao={(treinoId, treinoNome) => setView({ type: 'evolucao', treinoId, treinoNome })}
      onVerRecordes={() => setView({ type: 'recordes' })}
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
