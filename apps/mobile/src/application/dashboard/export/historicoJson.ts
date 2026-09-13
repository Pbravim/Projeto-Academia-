import { HISTORICO_EXPORT_SCHEMA, type HistoricoExportTree, type SessaoExport } from './HistoricoExportTypes';

export interface HistoricoJsonEnvelope {
  schema: string;
  exportado_em: string;
  sessoes: SessaoExport[];
}

/** Envelopa a árvore com `schema` (versão) e `exportado_em` (ISO UTC). */
export function buildHistoricoJson(tree: HistoricoExportTree, exportadoEm: Date): HistoricoJsonEnvelope {
  return {
    schema: HISTORICO_EXPORT_SCHEMA,
    exportado_em: exportadoEm.toISOString(),
    sessoes: tree.sessoes,
  };
}

export function serializeHistoricoJson(envelope: HistoricoJsonEnvelope): string {
  return JSON.stringify(envelope, null, 2);
}
