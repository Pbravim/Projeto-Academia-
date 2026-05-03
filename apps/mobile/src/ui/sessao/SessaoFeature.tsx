import type { SessaoAtivaControllerDependencies } from './hooks/useSessaoAtivaController';
import { useSessaoAtivaController } from './hooks/useSessaoAtivaController';
import type { SessaoFeatureControllerDependencies } from './hooks/useSessaoFeatureController';
import { useSessaoFeatureController } from './hooks/useSessaoFeatureController';
import { SessaoAtivaScreen } from './screens/SessaoAtivaScreen';
import { SessaoInicioScreen } from './screens/SessaoInicioScreen';
import { SessaoResumoScreen } from './screens/SessaoResumoScreen';
import type { SessaoDetalhe } from '../../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import type { SessaoTreinoPrimitives } from '../../domain/sessoes/entities/SessaoTreino';
import { LoadingScreen } from '../shared/LoadingScreen';

export interface SessaoFeatureDependencies {
  feature: SessaoFeatureControllerDependencies;
  ativa: SessaoAtivaControllerDependencies;
}

interface Props {
  dependencies: SessaoFeatureDependencies;
}

export function SessaoFeature({ dependencies }: Props) {
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
      />
    );
  }

  return (
    <SessaoInicioScreen
      treinos={controller.treinos}
      errorMessage={controller.errorMessage}
      isIniciando={controller.isIniciando}
      onIniciar={controller.onIniciarSessao}
    />
  );
}

interface SessaoAtivaViewProps {
  sessao: SessaoTreinoPrimitives;
  dependencies: SessaoAtivaControllerDependencies;
  onFinalizado: (detalhe: SessaoDetalhe) => void;
}

function SessaoAtivaView({ sessao, dependencies, onFinalizado }: SessaoAtivaViewProps) {
  const controller = useSessaoAtivaController(sessao, dependencies, onFinalizado);
  return <SessaoAtivaScreen {...controller} />;
}
