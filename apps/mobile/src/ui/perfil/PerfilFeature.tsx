import { useState } from 'react';
import { Alert } from 'react-native';
import type { PesoControllerDependencies } from '../peso/hooks/usePesoController';
import { usePesoController } from '../peso/hooks/usePesoController';
import { usePerfilController } from './hooks/usePerfilController';
import { useStatsController } from './hooks/useStatsController';
import { PerfilScreen } from './screens/PerfilScreen';
import type { GetDashboardStatsUseCase } from '../../application/dashboard/use-cases/GetDashboardStatsUseCase';
import type { ExportarHistoricoUseCase } from '../../application/dashboard/use-cases/ExportarHistoricoUseCase';
import type { ExportarBancoUseCase } from '../../application/dashboard/use-cases/ExportarBancoUseCase';
import type { ImportarBancoUseCase } from '../../application/dashboard/use-cases/ImportarBancoUseCase';
import type { ResetHistoricoUseCase } from '../../application/dashboard/use-cases/ResetHistoricoUseCase';
import type { AppLogger } from '../../infrastructure/logging/AppLogger';

export interface PerfilDependencies {
  peso: PesoControllerDependencies;
  getDashboardStats: GetDashboardStatsUseCase;
  exportarHistorico: ExportarHistoricoUseCase;
  exportarBanco: ExportarBancoUseCase;
  importarBanco: ImportarBancoUseCase;
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
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const onExportar = async () => {
    setIsExporting(true);
    try {
      await dependencies.exportarHistorico.execute();
    } catch (e) {
      dependencies.logger.error('perfil.exportar', e);
      Alert.alert('Erro', e instanceof Error ? e.message : 'Falha ao exportar.');
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

  const onBackup = async () => {
    setIsBackingUp(true);
    try {
      await dependencies.exportarBanco.execute();
    } catch (e) {
      dependencies.logger.error('perfil.backup', e);
      Alert.alert('Erro', e instanceof Error ? e.message : 'Falha ao gerar backup.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const onImport = async () => {
    setIsImporting(true);
    try {
      const result = await dependencies.importarBanco.execute();
      if (result.status === 'imported') {
        Alert.alert(
          'Backup restaurado',
          'Feche e reabra o app para carregar os dados importados.',
        );
      }
    } catch (e) {
      dependencies.logger.error('perfil.importar', e);
      Alert.alert('Erro', e instanceof Error ? e.message : 'Falha ao importar backup.');
    } finally {
      setIsImporting(false);
    }
  };

  const onImportConfirm = () => {
    Alert.alert(
      'Importar backup',
      'O banco de dados atual sera substituido pelo arquivo escolhido. Essa acao nao pode ser desfeita. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Importar', style: 'destructive', onPress: () => { void onImport(); } },
      ],
    );
  };

  return (
    <PerfilScreen
      perfil={perfil}
      peso={peso}
      statsState={statsState}
      isExporting={isExporting}
      isResetting={isResetting}
      isBackingUp={isBackingUp}
      isImporting={isImporting}
      onExportar={onExportar}
      onReset={onReset}
      onBackup={onBackup}
      onImport={onImportConfirm}
    />
  );
}
