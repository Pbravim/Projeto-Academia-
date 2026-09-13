import { useState } from 'react';

import type { ExportFormato } from '../../../application/dashboard/export/HistoricoExportTypes';
import type { ExportarHistoricoUseCase } from '../../../application/dashboard/use-cases/ExportarHistoricoUseCase';
import type { AppLogger } from '../../../infrastructure/logging/AppLogger';

export interface UseExportarHistoricoDependencies {
  exportarHistorico: ExportarHistoricoUseCase;
  logger: AppLogger;
  onError: (e: unknown) => void;
}

export interface UseExportarHistoricoState {
  isExporting: boolean;
  formatoVisible: boolean;
  abrir: () => void;
  fechar: () => void;
  exportar: (formato: ExportFormato) => Promise<void>;
}

/** Estado e orquestração compartilhados entre Dashboard e Perfil para "Exportar histórico". */
export function useExportarHistorico({
  exportarHistorico,
  logger,
  onError,
}: UseExportarHistoricoDependencies): UseExportarHistoricoState {
  const [isExporting, setIsExporting] = useState(false);
  const [formatoVisible, setFormatoVisible] = useState(false);

  const abrir = () => setFormatoVisible(true);
  const fechar = () => setFormatoVisible(false);

  const exportar = async (formato: ExportFormato) => {
    setFormatoVisible(false);
    setIsExporting(true);
    try {
      await exportarHistorico.execute(formato);
    } catch (e) {
      logger.error('historico.export_failed', e);
      onError(e);
    } finally {
      setIsExporting(false);
    }
  };

  return { isExporting, formatoVisible, abrir, fechar, exportar };
}
