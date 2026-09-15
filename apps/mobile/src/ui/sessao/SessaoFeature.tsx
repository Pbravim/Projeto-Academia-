import type { DecisaoFinalizacao } from '../../application/sessoes/use-cases/GetDecisaoFinalizacaoUseCase';
import type { SessaoDetalhe } from '../../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import type { SessaoTreinoPrimitives } from '../../domain/sessoes/entities/SessaoTreino';
import { LoadingScreen } from '../shared/LoadingScreen';

import type { SessaoAtivaControllerDependencies } from './hooks/useSessaoAtivaController';
import { useSessaoAtivaController } from './hooks/useSessaoAtivaController';
import type { SessaoDecisaoControllerDependencies } from './hooks/useSessaoDecisaoController';
import { useSessaoDecisaoController } from './hooks/useSessaoDecisaoController';
import type { SessaoFeatureControllerDependencies } from './hooks/useSessaoFeatureController';
import { useSessaoFeatureController } from './hooks/useSessaoFeatureController';
import { SessaoAtivaScreen } from './screens/SessaoAtivaScreen';
import { SessaoDecisaoScreen } from './screens/SessaoDecisaoScreen';
import { SessaoInicioScreen } from './screens/SessaoInicioScreen';
import { SessaoResumoScreen } from './screens/SessaoResumoScreen';

export interface SessaoFeatureDependencies {
  feature: SessaoFeatureControllerDependencies;
  ativa: SessaoAtivaControllerDependencies;
  decisao: SessaoDecisaoControllerDependencies;
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

  if (controller.view === 'decisao' && controller.decisaoPendente && controller.sessaoResumo) {
    return (
      <SessaoDecisaoView
        sessaoId={controller.sessaoResumo.sessao.id}
        decisao={controller.decisaoPendente}
        dependencies={dependencies.decisao}
        onConcluido={controller.onDecisaoConcluida}
      />
    );
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
        onFinalizado={(detalhe: SessaoDetalhe, decisao: DecisaoFinalizacao) => controller.onSessaoFinalizada(detalhe, decisao)}
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
      onIniciarLivre={controller.onIniciarLivre}
      onGoToTreinos={onGoToTreinos}
    />
  );
}

interface SessaoAtivaViewProps {
  sessao: SessaoTreinoPrimitives;
  dependencies: SessaoAtivaControllerDependencies;
  onFinalizado: (detalhe: SessaoDetalhe, decisao: DecisaoFinalizacao) => void;
  onCancelado: () => void;
}

function SessaoAtivaView({ sessao, dependencies, onFinalizado, onCancelado }: SessaoAtivaViewProps) {
  const controller = useSessaoAtivaController(sessao, dependencies, onFinalizado, onCancelado);
  return <SessaoAtivaScreen {...controller} />;
}

interface SessaoDecisaoViewProps {
  sessaoId: string;
  decisao: DecisaoFinalizacao;
  dependencies: SessaoDecisaoControllerDependencies;
  onConcluido: () => void;
}

function SessaoDecisaoView({ sessaoId, decisao, dependencies, onConcluido }: SessaoDecisaoViewProps) {
  const controller = useSessaoDecisaoController(sessaoId, decisao, dependencies, onConcluido);
  return <SessaoDecisaoScreen decisao={decisao} {...controller} />;
}
