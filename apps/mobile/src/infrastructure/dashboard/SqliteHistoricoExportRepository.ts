import type { SegmentoExportRow, SerieExportRow } from '../../application/dashboard/export/HistoricoExportTypes';
import type { HistoricoExportRepository } from '../../domain/dashboard/ports/HistoricoExportRepository';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

const FILTROS_SESSAO_SERIE = `
  st.status = 'finalizada'
  AND st.arquivado = 0
  AND st.deleted_at IS NULL
  AND se.deleted_at IS NULL
  AND sr.deleted_at IS NULL
  AND sr.tipo_serie = 'valida'
`;

/** Lê as linhas flat (série + degraus) que compõem a exportação de histórico. */
export class SqliteHistoricoExportRepository implements HistoricoExportRepository {
  constructor(private readonly db: SQLiteDatabaseClient) {}

  async listRowsParaExportacao(): Promise<{ series: SerieExportRow[]; segmentos: SegmentoExportRow[] }> {
    const series = await this.db.getAll<SerieExportRow>(
      `SELECT
         st.id AS sessao_id,
         st.data_hora_inicio,
         st.data_hora_fim,
         st.treino_id,
         st.treino_nome_snapshot,
         se.id AS sessao_exercicio_id,
         se.ordem AS exercicio_ordem,
         se.exercicio_id,
         se.nome_snapshot,
         se.grupo_muscular_snapshot,
         se.equipamento_snapshot,
         se.tracking_type_snapshot,
         se.metodo,
         se.grupo_id,
         se.substituido_por_exercicio_id,
         se.nome_original_snapshot,
         se.substituicao_motivo,
         sr.id AS serie_id,
         sr.ordem AS serie_ordem,
         sr.carga_kg,
         sr.repeticoes,
         sr.duracao_segundos,
         sr.distancia_metros,
         sr.intensidade,
         sr.observacao
       FROM sessao_treinos st
       JOIN sessao_exercicios se ON se.sessao_treino_id = st.id
       JOIN series_registradas sr ON sr.sessao_exercicio_id = se.id
       WHERE ${FILTROS_SESSAO_SERIE}
       ORDER BY st.data_hora_inicio ASC, st.id ASC, se.ordem ASC, sr.ordem ASC`
    );

    const segmentos = await this.db.getAll<SegmentoExportRow>(
      `SELECT sg.id, sg.serie_id, sg.ordem, sg.carga_kg, sg.repeticoes, sg.descanso_segundos
       FROM serie_segmentos sg
       JOIN series_registradas sr ON sr.id = sg.serie_id
       JOIN sessao_exercicios se ON se.id = sr.sessao_exercicio_id
       JOIN sessao_treinos st ON st.id = se.sessao_treino_id
       WHERE ${FILTROS_SESSAO_SERIE}
         AND sg.deleted_at IS NULL
       ORDER BY sg.serie_id, sg.ordem`
    );

    return { series, segmentos };
  }
}
