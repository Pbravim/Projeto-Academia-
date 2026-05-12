import { useState } from 'react';
import type { PesoControllerDependencies } from '../peso/hooks/usePesoController';
import { usePesoController } from '../peso/hooks/usePesoController';
import { usePerfilController } from './hooks/usePerfilController';
import { useStatsController } from './hooks/useStatsController';
import { PerfilScreen } from './screens/PerfilScreen';
import type { GetDashboardStatsUseCase } from '../../application/dashboard/use-cases/GetDashboardStatsUseCase';
import type { ExportarHistoricoUseCase } from '../../application/dashboard/use-cases/ExportarHistoricoUseCase';
import type { ResetHistoricoUseCase } from '../../application/dashboard/use-cases/ResetHistoricoUseCase';
import type { AppLogger } from '../../infrastructure/logging/AppLogger';

export interface PerfilDependencies {
  peso: PesoControllerDependencies;
  getDashboardStats: GetDashboardStatsUseCase;
  exportarHistorico: ExportarHistoricoUseCase;
  resetHistorico: ResetHistoricoUseCase;
  logger: AppLogger;
}

interface PerfilFeatureProps {
  dependencies: PerfilDependencies;
  onNameChange?: (name: string) => void;
  onPhotoChange?: (uri: string | null) => void;
}

export function PerfilFeature({ dependencies, onNameChange, onPhotoChange }: PerfilFeatureProps) {
  const peso = usePesoController(dependencies.peso);
  const perfil = usePerfilController(onNameChange, onPhotoChange);
  const statsState = useStatsController(dependencies.getDashboardStats);

  const [isExporting, setIsExporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const onExportar = async () => {
    setIsExporting(true);
    try {
      await dependencies.exportarHistorico.execute();
    } catch (e) {
      dependencies.logger.error('perfil.exportar', e);
    } finally {
      setIsExporting(false);
    }
  };

  const onReset = async () => {
    setIsResetting(true);
    try {
      await dependencies.resetHistorico.execute();
    } catch (e) {
      dependencies.logger.error('perfil.reset', e);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <PerfilScreen
      perfil={perfil}
      peso={peso}
      statsState={statsState}
      isExporting={isExporting}
      isResetting={isResetting}
      onExportar={onExportar}
      onReset={onReset}
    />
  );
}
