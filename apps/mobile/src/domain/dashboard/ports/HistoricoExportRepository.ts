import type { SegmentoExportRow, SerieExportRow } from '../../../application/dashboard/export/HistoricoExportTypes';

export interface HistoricoExportRepository {
  listRowsParaExportacao(): Promise<{ series: SerieExportRow[]; segmentos: SegmentoExportRow[] }>;
}
