import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { HistoricoExportRepository } from '../../../domain/dashboard/ports/HistoricoExportRepository';
import { buildHistoricoExportTree } from '../export/buildHistoricoExportTree';
import { flattenHistoricoCsvRows, serializeCsv } from '../export/historicoCsv';
import type { ExportFormato } from '../export/HistoricoExportTypes';
import { buildHistoricoJson, serializeHistoricoJson } from '../export/historicoJson';

interface ExportarHistoricoDependencies {
  historicoExportRepository: HistoricoExportRepository;
  now?: () => Date;
}

interface FormatoConfig {
  ext: string;
  mimeType: string;
  uti: string;
  serialize: (tree: ReturnType<typeof buildHistoricoExportTree>, now: Date) => string;
}

const FORMATOS: Record<ExportFormato, FormatoConfig> = {
  csv: {
    ext: 'csv',
    mimeType: 'text/csv',
    uti: 'public.comma-separated-values-text',
    serialize: (tree) => serializeCsv(flattenHistoricoCsvRows(tree)),
  },
  json: {
    ext: 'json',
    mimeType: 'application/json',
    uti: 'public.json',
    serialize: (tree, now) => serializeHistoricoJson(buildHistoricoJson(tree, now)),
  },
};

/** Gera CSV ou JSON com todo o histórico de sessões finalizadas e abre o diálogo de compartilhamento. */
export class ExportarHistoricoUseCase {
  constructor(private readonly deps: ExportarHistoricoDependencies) {}

  async execute(formato: ExportFormato): Promise<void> {
    const { series, segmentos } = await this.deps.historicoExportRepository.listRowsParaExportacao();
    if (series.length === 0) throw new Error('Nenhum historico para exportar.');

    const tree = buildHistoricoExportTree(series, segmentos);
    const now = (this.deps.now ?? (() => new Date()))();
    const config = FORMATOS[formato];
    const conteudo = config.serialize(tree, now);

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) throw new Error('Compartilhamento nao disponivel neste dispositivo.');

    const data = now.toISOString().slice(0, 10);
    const nome = `historico_${data}.${config.ext}`;
    const file = new File(Paths.cache, nome);

    try {
      file.write(conteudo);
      await Sharing.shareAsync(file.uri, {
        mimeType: config.mimeType,
        dialogTitle: 'Exportar historico de treinos',
        UTI: config.uti,
      });
    } finally {
      try { file.delete(); } catch { /* ignore cleanup errors */ }
    }
  }
}
