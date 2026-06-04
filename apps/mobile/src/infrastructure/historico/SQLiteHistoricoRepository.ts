import type {
  ExecucaoExercicio,
  ExecucaoExercicioSerie,
  HistoricoRepository,
  UltimaExecucaoValida,
} from '../../domain/historico/repositories/HistoricoRepository';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

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

export class SQLiteHistoricoRepository implements HistoricoRepository {
  constructor(private readonly database: SQLiteDatabaseClient) {}

  async getUltimasExecucoesValidas(): Promise<Map<string, UltimaExecucaoValida>> {
    const rows = await this.database.getAll<{ exercicio_id: string; carga_kg: number; repeticoes: number; data_hora_fim: string }>(
      `SELECT se.exercicio_id, sr.carga_kg, sr.repeticoes, st.data_hora_fim
       FROM (
         SELECT se2.exercicio_id, MAX(st2.data_hora_fim) AS max_fim, MAX(st2.id) AS max_id
         FROM sessao_exercicios se2
         JOIN sessao_treinos st2 ON se2.sessao_treino_id = st2.id
         WHERE st2.status = 'finalizada' AND st2.data_hora_fim IS NOT NULL AND st2.deleted_at IS NULL AND se2.deleted_at IS NULL
         GROUP BY se2.exercicio_id
       ) latest
       JOIN sessao_exercicios se ON se.exercicio_id = latest.exercicio_id AND se.deleted_at IS NULL
       JOIN sessao_treinos st ON se.sessao_treino_id = st.id AND st.data_hora_fim = latest.max_fim AND st.id = latest.max_id AND st.deleted_at IS NULL
       JOIN series_registradas sr ON sr.sessao_exercicio_id = se.id AND sr.deleted_at IS NULL
       ORDER BY se.exercicio_id, (sr.carga_kg * (1.0 + sr.repeticoes / 30.0)) DESC`
    );

    const result = new Map<string, UltimaExecucaoValida>();
    for (const row of rows) {
      if (!result.has(row.exercicio_id)) {
        result.set(row.exercicio_id, {
          cargaKg: row.carga_kg,
          repeticoes: row.repeticoes,
          dataExecucao: row.data_hora_fim,
        });
      }
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
       ORDER BY st.data_hora_fim DESC, (sr.carga_kg * (1.0 + sr.repeticoes / 30.0)) DESC
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
    return groupBySession(rows);
  }

  async getHistoricoExercicios(exercicioIds: string[]): Promise<Map<string, ExecucaoExercicio[]>> {
    if (exercicioIds.length === 0) return new Map();

    const CHUNK_SIZE = 999;
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

    const result = new Map<string, ExecucaoExercicio[]>();
    for (const [id, idRows] of byExercicio) {
      result.set(id, groupBySession(idRows));
    }
    return result;
  }
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
        tipoSerie: (row.tipo_serie === 'aquecimento' ? 'aquecimento' : 'valida') as const,
      };
      sessaoMap.get(row.sessao_treino_id)!.series.push(serie);
    }
  }

  return sessaoOrder.map((id) => sessaoMap.get(id)!);
}
