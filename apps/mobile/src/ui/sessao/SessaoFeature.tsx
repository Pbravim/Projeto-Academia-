import type { SessaoDetalhe } from '../../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import type { SessaoTreinoPrimitives } from '../../domain/sessoes/entities/SessaoTreino';
import { LoadingScreen } from '../shared/LoadingScreen';

import type { SessaoAtivaControllerDependencies } from './hooks/useSessaoAtivaController';
import { useSessaoAtivaController } from './hooks/useSessaoAtivaController';
import type { SessaoFeatureControllerDependencies } from './hooks/useSessaoFeatureController';
import { useSessaoFeatureController } from './hooks/useSessaoFeatureController';
import { SessaoAtivaScreen } from './screens/SessaoAtivaScreen';
import { SessaoInicioScreen } from './screens/SessaoInicioScreen';
import { SessaoResumoScreen } from './screens/SessaoResumoScreen';

export interface SessaoFeatureDependencies {
  feature: SessaoFeatureControllerDependencies;
  ativa: SessaoAtivaControllerDependencies;
}

interface Props {
  dependencies: SessaoFeatureDependencies;
  onGoToTreinos?: () => void;
}

export function SessaoFeature({ dependencies, onGoToTreinos }: Props) {
  const controller = useSessaoFeatureController(dependencies.feature);

  if (controller.view === 'loading') {
    return <LoadingScreen />;
  }

  if (controller.view === 'resumo' && controller.sessaoResumo) {
    return (
      <SessaoResumoScreen
        detalhe={controller.sessaoResumo}
        onFechar={controller.onFecharResumo}
      />
    );
  }

  if (controller.view === 'ativa' && controller.sessaoAtiva) {
    return (
      <SessaoAtivaView
        sessao={controller.sessaoAtiva}
        dependencies={dependencies.ativa}
        onFinalizado={(detalhe: SessaoDetalhe) => controller.onSessaoFinalizada(detalhe)}
        onCancelado={controller.onSessaoCancelada}
      />
    );
  }

  return (
    <SessaoInicioScreen
      treinos={controller.treinos}
      treinosComExercicios={controller.treinosComExercicios}
      sugestao={controller.sugestao}
      errorMessage={controller.errorMessage}
      isIniciando={controller.isIniciando}
      onIniciar={controller.onIniciarSessao}
      onGoToTreinos={onGoToTreinos}
    />
  );
}

interface SessaoAtivaViewProps {
  sessao: SessaoTreinoPrimitives;
  dependencies: SessaoAtivaControllerDependencies;
  onFinalizado: (detalhe: SessaoDetalhe) => void;
  onCancelado: () => void;
}

function SessaoAtivaView({ sessao, dependencies, onFinalizado, onCancelado }: SessaoAtivaViewProps) {
  const controller = useSessaoAtivaController(sessao, dependencies, onFinalizado, onCancelado);
  return <SessaoAtivaScreen {...controller} />;
}
