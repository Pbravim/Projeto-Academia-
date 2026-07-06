import { useState } from 'react';
import { ConfirmDialog } from '../shared/components/ConfirmDialog';
import { useT } from '../shared/i18n';
import type { PesoControllerDependencies } from '../peso/hooks/usePesoController';
import { usePesoController } from '../peso/hooks/usePesoController';
import { usePerfilController } from './hooks/usePerfilController';
import { useStatsController } from './hooks/useStatsController';
import { PerfilScreen } from './screens/PerfilScreen';
import { BackupSyncSection } from './components/BackupSyncSection';
import type { BackupSyncDependencies } from './hooks/useBackupSync';
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
  backup: BackupSyncDependencies;
}

interface PerfilFeatureProps {
  dependencies: PerfilDependencies;
  onNameChange?: (name: string) => void;
  onPhotoChange?: (uri: string | null) => void;
}

export function PerfilFeature({ dependencies, onNameChange, onPhotoChange }: PerfilFeatureProps) {
  const t = useT();
  const peso = usePesoController(dependencies.peso);
  const perfil = usePerfilController(onNameChange, onPhotoChange);
  const statsState = useStatsController(dependencies.getDashboardStats);

  const [isExporting, setIsExporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [confirmImportVisible, setConfirmImportVisible] = useState(false);
  const [infoDialog, setInfoDialog] = useState<{ title: string; message: string } | null>(null);

  const onExportar = async () => {
    setIsExporting(true);
    try {
      await dependencies.exportarHistorico.execute();
    } catch (e) {
      dependencies.logger.error('perfil.exportar', e);
      setInfoDialog({ title: t('common.error'), message: e instanceof Error ? e.message : t('perfil.dialogs.erroExportar') });
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
      setInfoDialog({ title: t('common.error'), message: e instanceof Error ? e.message : t('perfil.dialogs.erroBackup') });
    } finally {
      setIsBackingUp(false);
    }
  };

  const onImport = async () => {
    setIsImporting(true);
    try {
      const result = await dependencies.importarBanco.execute();
      if (result.status === 'imported') {
        setInfoDialog({
          title: t('perfil.dialogs.backupRestauradoTitle'),
          message: t('perfil.dialogs.backupRestauradoMessage'),
        });
      }
    } catch (e) {
      dependencies.logger.error('perfil.importar', e);
      setInfoDialog({ title: t('common.error'), message: e instanceof Error ? e.message : t('perfil.dialogs.erroImportar') });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
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
        onImport={() => setConfirmImportVisible(true)}
        backupSection={<BackupSyncSection backup={dependencies.backup} />}
      />

      <ConfirmDialog
        visible={confirmImportVisible}
        title={t('perfil.dialogs.confirmImportTitle')}
        message={t('perfil.dialogs.confirmImportMessage')}
        confirmLabel={t('perfil.dialogs.confirmImportLabel')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => {
          setConfirmImportVisible(false);
          void onImport();
        }}
        onCancel={() => setConfirmImportVisible(false)}
      />

      <ConfirmDialog
        visible={infoDialog !== null}
        title={infoDialog?.title ?? ''}
        message={infoDialog?.message ?? ''}
        confirmLabel={t('common.ok')}
        hideCancel
        onConfirm={() => setInfoDialog(null)}
        onCancel={() => setInfoDialog(null)}
      />
    </>
  );
}
