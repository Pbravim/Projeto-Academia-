import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

import { useTabActive } from '../shared/tabActivity';

import type { DashboardControllerDependencies } from './hooks/useDashboardController';
import { useDashboardController } from './hooks/useDashboardController';
import type { TreinoEvolucaoControllerDeps } from './hooks/useTreinoEvolucaoController';
import { useTreinoEvolucaoController } from './hooks/useTreinoEvolucaoController';
import { DashboardScreen } from './screens/DashboardScreen';
import { GerenciarSessoesScreen } from './screens/GerenciarSessoesScreen';
import { RecordesPessoaisScreen } from './screens/RecordesPessoaisScreen';
import { TreinoEvolucaoScreen } from './screens/TreinoEvolucaoScreen';

interface Props {
  dependencies: DashboardControllerDependencies & TreinoEvolucaoControllerDeps;
  onGoToSessao?: () => void;
}

interface TreinoSelected {
  treinoId: string;
  treinoNome: string;
}

type ActiveView =
  | { type: 'dashboard' }
  | { type: 'recordes' }
  | { type: 'evolucao'; treinoId: string; treinoNome: string }
  | { type: 'sessoes'; treinoId: string; treinoNome: string };

export function DashboardFeature({ dependencies, onGoToSessao }: Props) {
  const [view, setView] = useState<ActiveView>({ type: 'dashboard' });
  const tabActive = useTabActive();
  const controller = useDashboardController(dependencies);

  useEffect(() => {
    // Keep-alive: aba oculta não registra handler (BackHandler é LIFO e ela
    // consumiria o back da aba visível).
    if (!tabActive) return;
    if (view.type === 'dashboard') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setView({ type: 'dashboard' });
      return true;
    });
    return () => sub.remove();
  }, [view.type, tabActive]);

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

  if (view.type === 'sessoes') {
    const grupo = controller.stats?.evolucaoPorTreino.find((g) => g.treinoId === view.treinoId);
    return (
      <GerenciarSessoesScreen
        treinoNome={view.treinoNome}
        sessoes={grupo?.sessoes ?? []}
        sessoesArquivadas={grupo?.sessoesArquivadas ?? []}
        onArquivar={(id) => { void controller.onArquivarSessao(id); }}
        onDesarquivar={(id) => { void controller.onDesarquivarSessao(id); }}
        onDeletar={(id) => { void controller.onDeletarSessao(id); }}
        onArquivarTodas={(ids) => { void controller.onArquivarTodasSessoesTreino(ids); }}
        onDeletarTodas={(ids) => { void controller.onDeletarTodasSessoesTreino(ids); }}
        onBack={() => setView({ type: 'dashboard' })}
      />
    );
  }

  return (
    <DashboardScreen
      {...controller}
      onVerEvolucao={(treinoId, treinoNome) => setView({ type: 'evolucao', treinoId, treinoNome })}
      onVerRecordes={() => setView({ type: 'recordes' })}
      onGerenciarSessoes={(treinoId, treinoNome) => setView({ type: 'sessoes', treinoId, treinoNome })}
      onGoToSessao={onGoToSessao}
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
