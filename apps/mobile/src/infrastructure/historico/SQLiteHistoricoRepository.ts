import type {
  ExecucaoExercicio,
  ExecucaoExercicioSegmento,
  ExecucaoExercicioSerie,
  HistoricoRepository,
  UltimaExecucaoValida,
} from '../../domain/historico/repositories/HistoricoRepository';
import { estimativa1rmSql } from '../../shared/utils/estimativa1rm';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

const CHUNK_SIZE = 999;

interface UltimaRow {
  carga_kg: number;
  repeticoes: number;
  data_hora_fim: string;
}

interface HistoricoRow {
  exercicio_id: string;
  sessao_treino_id: string;
  nome_snapshot: string;
  data_hora_fim: string;
  nome_original_snapshot: string | null;
  substituicao_motivo: string | null;
  serie_id: string | null;
  carga_kg: number | null;
  repeticoes: number | null;
  observacao: string | null;
  ordem: number | null;
  tipo_serie: string | null;
}

interface SegmentoRow {
  serie_id: string;
  ordem: number;
  carga_kg: number;
  repeticoes: number;
  descanso_segundos: number | null;
}

export class SQLiteHistoricoRepository implements HistoricoRepository {
  constructor(private readonly database: SQLiteDatabaseClient) {}

  async getUltimasExecucoesValidas(): Promise<Map<string, UltimaExecucaoValida>> {
    // Uma única janela por exercício: sessão mais recente primeiro (id como
    // tiebreak de empate de data_hora_fim), e dentro dela a série válida de
    // maior 1RM estimado. O antigo GROUP BY com MAX(data_hora_fim) × MAX(id)
    // independentes fazia o exercício sumir quando a sessão mais recente não
    // tinha o maior id lexicográfico (P0.5, rodada 3).
    const rows = await this.database.getAll<{ exercicio_id: string; carga_kg: number; repeticoes: number; data_hora_fim: string }>(
      `SELECT exercicio_id, carga_kg, repeticoes, data_hora_fim FROM (
         SELECT se.exercicio_id, sr.carga_kg, sr.repeticoes, st.data_hora_fim,
                ROW_NUMBER() OVER (
                  PARTITION BY se.exercicio_id
                  ORDER BY st.data_hora_fim DESC, st.id DESC, ${estimativa1rmSql()} DESC
                ) AS rn
         FROM sessao_exercicios se
         JOIN sessao_treinos st ON se.sessao_treino_id = st.id
           AND st.status = 'finalizada' AND st.data_hora_fim IS NOT NULL AND st.deleted_at IS NULL
         JOIN series_registradas sr ON sr.sessao_exercicio_id = se.id
           AND sr.deleted_at IS NULL AND sr.tipo_serie = 'valida'
         WHERE se.deleted_at IS NULL
       ) WHERE rn = 1`
    );

    const result = new Map<string, UltimaExecucaoValida>();
    for (const row of rows) {
      result.set(row.exercicio_id, {
        cargaKg: row.carga_kg,
        repeticoes: row.repeticoes,
        dataExecucao: row.data_hora_fim,
      });
    }
    return result;
  }

  async getUltimaExecucaoValida(exercicioId: string): Promise<UltimaExecucaoValida | null> {
    const row = await this.database.getFirst<UltimaRow>(
      `SELECT sr.carga_kg, sr.repeticoes, st.data_hora_fim
       FROM series_registradas sr
       INNER JOIN sessao_exercicios se ON sr.sessao_exercicio_id = se.id AND se.deleted_at IS NULL
       INNER JOIN sessao_treinos st ON se.sessao_treino_id = st.id AND st.deleted_at IS NULL
       WHERE se.exercicio_id = ? AND st.status = 'finalizada' AND sr.deleted_at IS NULL
         AND sr.tipo_serie = 'valida'
       ORDER BY st.data_hora_fim DESC, ${estimativa1rmSql()} DESC
       LIMIT 1`,
      [exercicioId]
    );
    if (!row) return null;
    return { cargaKg: row.carga_kg, repeticoes: row.repeticoes, dataExecucao: row.data_hora_fim };
  }

  async getHistoricoExercicio(exercicioId: string): Promise<ExecucaoExercicio[]> {
    const rows = await this.database.getAll<HistoricoRow>(
      `SELECT se.exercicio_id, se.sessao_treino_id, se.nome_snapshot, st.data_hora_fim,
              se.nome_original_snapshot, se.substituicao_motivo,
              sr.id as serie_id, sr.carga_kg, sr.repeticoes, sr.observacao, sr.ordem, sr.tipo_serie
       FROM sessao_exercicios se
       INNER JOIN sessao_treinos st ON se.sessao_treino_id = st.id AND st.deleted_at IS NULL
       INNER JOIN series_registradas sr ON sr.sessao_exercicio_id = se.id AND sr.deleted_at IS NULL
       WHERE se.exercicio_id = ? AND st.status = 'finalizada' AND st.data_hora_fim IS NOT NULL AND se.deleted_at IS NULL
       ORDER BY st.data_hora_fim DESC, sr.ordem ASC`,
      [exercicioId]
    );
    const segmentosPorSerie = await this.fetchSegmentosPorSerie(serieIdsDe(rows));
    return anexarSegmentos(groupBySession(rows), segmentosPorSerie);
  }

  private async fetchSegmentosPorSerie(serieIds: string[]): Promise<Map<string, ExecucaoExercicioSegmento[]>> {
    const porSerie = new Map<string, ExecucaoExercicioSegmento[]>();
    if (serieIds.length === 0) return porSerie;

    for (let i = 0; i < serieIds.length; i += CHUNK_SIZE) {
      const chunk = serieIds.slice(i, i + CHUNK_SIZE);
      const placeholders = chunk.map(() => '?').join(', ');
      const rows = await this.database.getAll<SegmentoRow>(
        `SELECT serie_id, ordem, carga_kg, repeticoes, descanso_segundos
         FROM serie_segmentos
         WHERE serie_id IN (${placeholders}) AND deleted_at IS NULL
           AND carga_kg IS NOT NULL AND repeticoes IS NOT NULL
         ORDER BY ordem ASC`,
        chunk
      );
      for (const row of rows) {
        const arr = porSerie.get(row.serie_id) ?? [];
        arr.push({ ordem: row.ordem, cargaKg: row.carga_kg, repeticoes: row.repeticoes, descansoSegundos: row.descanso_segundos });
        porSerie.set(row.serie_id, arr);
      }
    }
    return porSerie;
  }

  async getHistoricoExercicios(exercicioIds: string[]): Promise<Map<string, ExecucaoExercicio[]>> {
    if (exercicioIds.length === 0) return new Map();

    const allRows: HistoricoRow[] = [];

    for (let i = 0; i < exercicioIds.length; i += CHUNK_SIZE) {
      const chunk = exercicioIds.slice(i, i + CHUNK_SIZE);
      const placeholders = chunk.map(() => '?').join(', ');
      const rows = await this.database.getAll<HistoricoRow>(
        `SELECT se.exercicio_id, se.sessao_treino_id, se.nome_snapshot, st.data_hora_fim,
                se.nome_original_snapshot, se.substituicao_motivo,
                sr.id as serie_id, sr.carga_kg, sr.repeticoes, sr.observacao, sr.ordem, sr.tipo_serie
         FROM sessao_exercicios se
         INNER JOIN sessao_treinos st ON se.sessao_treino_id = st.id AND st.deleted_at IS NULL
         INNER JOIN series_registradas sr ON sr.sessao_exercicio_id = se.id AND sr.deleted_at IS NULL
         WHERE se.exercicio_id IN (${placeholders}) AND st.status = 'finalizada' AND st.data_hora_fim IS NOT NULL AND se.deleted_at IS NULL
         ORDER BY se.exercicio_id, st.data_hora_fim DESC, sr.ordem ASC`,
        chunk
      );
      allRows.push(...rows);
    }

    // Re-sort merged results to maintain consistent ordering across chunks.
    allRows.sort((a, b) => {
      if (a.exercicio_id !== b.exercicio_id) return a.exercicio_id.localeCompare(b.exercicio_id);
      if (a.data_hora_fim !== b.data_hora_fim) return b.data_hora_fim.localeCompare(a.data_hora_fim);
      return (a.ordem ?? 0) - (b.ordem ?? 0);
    });

    const byExercicio = new Map<string, HistoricoRow[]>();
    for (const row of allRows) {
      const list = byExercicio.get(row.exercicio_id) ?? [];
      list.push(row);
      byExercicio.set(row.exercicio_id, list);
    }

    const segmentosPorSerie = await this.fetchSegmentosPorSerie(serieIdsDe(allRows));

    const result = new Map<string, ExecucaoExercicio[]>();
    for (const [id, idRows] of byExercicio) {
      result.set(id, anexarSegmentos(groupBySession(idRows), segmentosPorSerie));
    }
    return result;
  }
}

function serieIdsDe(rows: HistoricoRow[]): string[] {
  const ids: string[] = [];
  for (const row of rows) {
    if (row.serie_id !== null) ids.push(row.serie_id);
  }
  return ids;
}

/** Anexa os degraus de cada serie (por id) sem crescer a complexidade de groupBySession. */
function anexarSegmentos(
  sessoes: ExecucaoExercicio[],
  segmentosPorSerie: Map<string, ExecucaoExercicioSegmento[]>
): ExecucaoExercicio[] {
  for (const sessao of sessoes) {
    for (const serie of sessao.series) {
      const segmentos = segmentosPorSerie.get(serie.id);
      if (segmentos) serie.segmentos = segmentos;
    }
  }
  return sessoes;
}

function groupBySession(rows: HistoricoRow[]): ExecucaoExercicio[] {
  const sessaoMap = new Map<string, ExecucaoExercicio>();
  const sessaoOrder: string[] = [];

  for (const row of rows) {
    if (!sessaoMap.has(row.sessao_treino_id)) {
      sessaoMap.set(row.sessao_treino_id, {
        sessaoTreinoId: row.sessao_treino_id,
        dataExecucao: row.data_hora_fim,
        nomeSnapshot: row.nome_snapshot,
        series: [],
        substituiuExercicio: row.nome_original_snapshot
          ? { nomeOriginal: row.nome_original_snapshot, motivo: row.substituicao_motivo }
          : null,
      });
      sessaoOrder.push(row.sessao_treino_id);
    }

    if (row.serie_id !== null && row.carga_kg !== null && row.repeticoes !== null) {
      const serie: ExecucaoExercicioSerie = {
        id: row.serie_id,
        cargaKg: row.carga_kg,
        repeticoes: row.repeticoes,
        observacao: row.observacao,
        ordem: row.ordem!,
        tipoSerie: row.tipo_serie === 'aquecimento' ? 'aquecimento' : 'valida',
      };
      sessaoMap.get(row.sessao_treino_id)!.series.push(serie);
    }
  }

  return sessaoOrder.map((id) => sessaoMap.get(id)!);
}
