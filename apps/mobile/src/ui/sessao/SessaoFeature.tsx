import type { GetHistoricoAnteriorDaSessaoUseCase } from '../../application/historico/use-cases/GetHistoricoAnteriorDaSessaoUseCase';
import type { DecisaoFinalizacao } from '../../application/sessoes/use-cases/GetDecisaoFinalizacaoUseCase';
import type { SessaoDetalhe } from '../../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import type { SessaoTreinoPrimitives } from '../../domain/sessoes/entities/SessaoTreino';
import { LoadingScreen } from '../shared/LoadingScreen';

import { SessaoProgressaoProvider } from './components/SessaoProgressaoContext';
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
  getHistoricoAnterior?: GetHistoricoAnteriorDaSessaoUseCase;
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
        getHistoricoAnterior={dependencies.getHistoricoAnterior}
        onFechar={controller.onFecharResumo}
      />
    );
  }

  if (controller.view === 'ativa' && controller.sessaoAtiva) {
    return (
      <SessaoAtivaView
        sessao={controller.sessaoAtiva}
        dependencies={dependencies.ativa}
        getHistoricoAnterior={dependencies.getHistoricoAnterior}
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
  getHistoricoAnterior?: GetHistoricoAnteriorDaSessaoUseCase;
  sessao: SessaoTreinoPrimitives;
  dependencies: SessaoAtivaControllerDependencies;
  onFinalizado: (detalhe: SessaoDetalhe, decisao: DecisaoFinalizacao) => void;
  onCancelado: () => void;
}

function SessaoAtivaView({ sessao, dependencies, onFinalizado, onCancelado, getHistoricoAnterior }: SessaoAtivaViewProps) {
  const controller = useSessaoAtivaController(sessao, dependencies, onFinalizado, onCancelado);
  return (
    <SessaoProgressaoProvider detalhe={controller.detalhe} useCase={getHistoricoAnterior}>
      <SessaoAtivaScreen {...controller} />
    </SessaoProgressaoProvider>
  );
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
