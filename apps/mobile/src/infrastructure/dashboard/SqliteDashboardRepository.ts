import type {
  DashboardRepository,
  DashboardStats,
  DiaAderencia,
  EvolucaoPorTreino,
  ExercicioEvolucao,
  SerieEvolucao,
  SessaoComVolume,
  SessaoExercicioEvolucao,
  TreinoComUltimaSessao,
} from '../../domain/dashboard/repositories/DashboardRepository';
import { calcularEstimativa1rm, estimativa1rmSql } from '../../shared/utils/estimativa1rm';
import { nowIso } from '../../shared/utils/syncStamp';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

/**
 * Chave de data no fuso LOCAL do device (YYYY-MM-DD). O banco guarda ISO-UTC;
 * bucketar por dia UTC jogava treino das 21h+ (BRT) no dia seguinte — as
 * queries usam date(..., 'localtime') e as chaves JS este helper (P1-A, rodada 3).
 */
function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return localDateKey(d);
}

export class SqliteDashboardRepository implements DashboardRepository {
  constructor(private readonly database: SQLiteDatabaseClient) {}

  async getStats(): Promise<DashboardStats> {
    const now = new Date();
    const todayKey = localDateKey(now);
    const year = now.getFullYear();
    const month = now.getMonth();

    const monday = getMondayOfWeek(now);
    const mondayDate = new Date(monday + 'T12:00:00');
    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(sundayDate.getDate() + 6);
    const sundayKey = localDateKey(sundayDate);

    const firstOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const lastOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const yearStr = String(year);

    const [total, sessoes, records, ultimoMes, weekRows, monthRows, yearRows] = await Promise.all([
      this.database.getFirst<{ count: number }>(
        `SELECT COUNT(*) as count FROM sessao_treinos st
         WHERE status = 'finalizada' AND arquivado = 0 AND st.deleted_at IS NULL
         AND EXISTS (
           SELECT 1 FROM sessao_exercicios se
           JOIN series_registradas sr ON sr.sessao_exercicio_id = se.id
           WHERE se.sessao_treino_id = st.id AND se.deleted_at IS NULL AND sr.deleted_at IS NULL
         )`
      ),
      this.database.getAll<{
        id: string;
        treino_id: string;
        treino_nome_snapshot: string;
        data_hora_inicio: string;
        data_hora_fim: string | null;
        arquivado: number;
        volume_total: number;
        melhor_orm: number;
      }>(
        `SELECT
           st.id,
           st.treino_id,
           st.treino_nome_snapshot,
           st.data_hora_inicio,
           st.data_hora_fim,
           st.arquivado,
           COALESCE(SUM(CASE WHEN sr.tipo_serie = 'valida' THEN sr.carga_kg * sr.repeticoes + COALESCE((
             SELECT SUM(sg.carga_kg * sg.repeticoes) FROM serie_segmentos sg
             WHERE sg.serie_id = sr.id AND sg.deleted_at IS NULL
           ), 0) END), 0) AS volume_total,
           COALESCE(MAX(CASE WHEN sr.tipo_serie = 'valida' THEN ${estimativa1rmSql()} END), 0) AS melhor_orm
         FROM sessao_treinos st
         LEFT JOIN sessao_exercicios se ON se.sessao_treino_id = st.id AND se.deleted_at IS NULL
         LEFT JOIN series_registradas sr ON sr.sessao_exercicio_id = se.id AND sr.deleted_at IS NULL
         WHERE st.status = 'finalizada' AND st.deleted_at IS NULL
         GROUP BY st.id
         HAVING COUNT(sr.id) > 0
         ORDER BY st.data_hora_inicio DESC`
      ),
      this.database.getAll<{ exercicio_nome: string; melhor_orm: number }>(
        `SELECT e.name AS exercicio_nome,
                MAX(${estimativa1rmSql()}) AS melhor_orm
         FROM series_registradas sr
         JOIN sessao_exercicios se ON sr.sessao_exercicio_id = se.id AND se.deleted_at IS NULL
         JOIN sessao_treinos st ON se.sessao_treino_id = st.id AND st.deleted_at IS NULL
         JOIN exercises e ON se.exercicio_id = e.id AND e.deleted_at IS NULL
         WHERE st.status = 'finalizada' AND st.arquivado = 0 AND sr.deleted_at IS NULL
           AND sr.tipo_serie = 'valida'
           AND sr.carga_kg IS NOT NULL AND sr.repeticoes IS NOT NULL
         GROUP BY se.exercicio_id
         ORDER BY melhor_orm DESC
         LIMIT 10`
      ),
      this.database.getFirst<{ count: number }>(
        "SELECT COUNT(*) as count FROM sessao_treinos WHERE status = 'finalizada' AND arquivado = 0 AND deleted_at IS NULL AND data_hora_inicio >= ?",
        [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()]
      ),
      this.database.getAll<{ dia: string; total: number }>(
        `SELECT date(data_hora_inicio, 'localtime') AS dia, COUNT(*) AS total
         FROM sessao_treinos
         WHERE status = 'finalizada' AND arquivado = 0 AND deleted_at IS NULL AND date(data_hora_inicio, 'localtime') >= ? AND date(data_hora_inicio, 'localtime') <= ?
         GROUP BY dia`,
        [monday, sundayKey]
      ),
      this.database.getAll<{ dia: string; total: number }>(
        `SELECT date(data_hora_inicio, 'localtime') AS dia, COUNT(*) AS total
         FROM sessao_treinos
         WHERE status = 'finalizada' AND arquivado = 0 AND deleted_at IS NULL AND date(data_hora_inicio, 'localtime') >= ? AND date(data_hora_inicio, 'localtime') <= ?
         GROUP BY dia`,
        [firstOfMonth, lastOfMonth]
      ),
      this.database.getAll<{ mes: string; total: number }>(
        `SELECT strftime('%Y-%m', data_hora_inicio, 'localtime') AS mes, COUNT(*) AS total
         FROM sessao_treinos
         WHERE status = 'finalizada' AND arquivado = 0 AND deleted_at IS NULL AND strftime('%Y', data_hora_inicio, 'localtime') = ?
         GROUP BY mes`,
        [yearStr]
      ),
    ]);

    const byTreino = new Map<string, { treinoId: string; sessoes: SessaoComVolume[]; sessoesArquivadas: SessaoComVolume[] }>();
    for (const row of sessoes) {
      const entry: SessaoComVolume = {
        id: row.id,
        dataHoraInicio: row.data_hora_inicio,
        dataHoraFim: row.data_hora_fim,
        volumeTotal: Math.round(row.volume_total),
        melhorOrm: Math.round(row.melhor_orm * 10) / 10,
        duracaoMin: row.data_hora_fim
          ? Math.round(
              (new Date(row.data_hora_fim).getTime() - new Date(row.data_hora_inicio).getTime()) /
                60000
            )
          : null,
        arquivado: row.arquivado === 1,
      };
      const key = row.treino_nome_snapshot;
      const existing = byTreino.get(key) ?? { treinoId: row.treino_id, sessoes: [], sessoesArquivadas: [] };
      if (entry.arquivado) {
        existing.sessoesArquivadas.push(entry);
      } else {
        existing.sessoes.push(entry);
      }
      byTreino.set(key, existing);
    }

    const evolucaoPorTreino: EvolucaoPorTreino[] = Array.from(byTreino.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([treinoNome, { treinoId, sessoes: sessoesDoTreino, sessoesArquivadas }]) => ({
        treinoId,
        treinoNome,
        sessoes: sessoesDoTreino.slice(0, 10),
        sessoesArquivadas,
      }));

    const DIAS_PT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
    const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    const weekMap = new Map(weekRows.map((r) => [r.dia, r.total]));
    const aderenciaSemanal: DiaAderencia[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(mondayDate);
      d.setDate(d.getDate() + i);
      const key = localDateKey(d);
      aderenciaSemanal.push({ label: DIAS_PT[i]!, totalSessoes: weekMap.get(key) ?? 0, isToday: key === todayKey });
    }

    const monthMap = new Map(monthRows.map((r) => [r.dia, r.total]));
    const aderenciaMensal: DiaAderencia[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      aderenciaMensal.push({ label: String(d).padStart(2, '0'), totalSessoes: monthMap.get(key) ?? 0, isToday: key === todayKey });
    }

    const yearMap = new Map(yearRows.map((r) => [r.mes, r.total]));
    const aderenciaAnual: DiaAderencia[] = [];
    for (let m = 0; m < 12; m++) {
      const key = `${year}-${String(m + 1).padStart(2, '0')}`;
      aderenciaAnual.push({ label: MESES_PT[m]!, totalSessoes: yearMap.get(key) ?? 0, isToday: m === month });
    }

    return {
      totalSessoes: total?.count ?? 0,
      sessoesUltimoMes: ultimoMes?.count ?? 0,
      aderenciaSemanal,
      aderenciaMensal,
      aderenciaAnual,
      evolucaoPorTreino,
      recordesPessoais: records.map((r) => ({
        exercicioNome: r.exercicio_nome,
        melhorOrmKg: Math.round(r.melhor_orm * 10) / 10,
      })),
    };
  }

  async getEvolucaoExercicios(treinoId: string): Promise<ExercicioEvolucao[]> {
    const rows = await this.database.getAll<{
      exercicio_id: string;
      exercicio_nome: string;
      group_muscle: string;
      sessao_id: string;
      data_hora_inicio: string;
      carga_kg: number;
      repeticoes: number;
    }>(
      `SELECT
         se.exercicio_id,
         se.nome_snapshot           AS exercicio_nome,
         se.grupo_muscular_snapshot AS group_muscle,
         st.id                      AS sessao_id,
         st.data_hora_inicio,
         sr.carga_kg,
         sr.repeticoes
       FROM sessao_treinos st
       JOIN sessao_exercicios se ON se.sessao_treino_id = st.id AND se.deleted_at IS NULL
       JOIN series_registradas sr
         ON sr.sessao_exercicio_id = se.id AND sr.deleted_at IS NULL
       WHERE st.treino_id = ? AND st.status = 'finalizada' AND st.arquivado = 0 AND st.deleted_at IS NULL
         AND sr.tipo_serie = 'valida'
         AND sr.carga_kg IS NOT NULL AND sr.repeticoes IS NOT NULL
       ORDER BY se.nome_snapshot ASC, st.data_hora_inicio DESC, sr.ordem ASC`,
      [treinoId]
    );

    interface ExAccum {
      nome: string;
      group: string;
      sessaoOrder: string[];
      sessoes: Map<string, { dataHoraInicio: string; series: SerieEvolucao[] }>;
    }

    const byExercicio = new Map<string, ExAccum>();

    for (const row of rows) {
      let ex = byExercicio.get(row.exercicio_id);
      if (!ex) {
        ex = { nome: row.exercicio_nome, group: row.group_muscle, sessaoOrder: [], sessoes: new Map() };
        byExercicio.set(row.exercicio_id, ex);
      }

      if (!ex.sessoes.has(row.sessao_id)) {
        if (ex.sessaoOrder.length >= 10) continue;
        ex.sessaoOrder.push(row.sessao_id);
        ex.sessoes.set(row.sessao_id, { dataHoraInicio: row.data_hora_inicio, series: [] });
      }

      ex.sessoes.get(row.sessao_id)!.series.push({ cargaKg: row.carga_kg, repeticoes: row.repeticoes });
    }

    return Array.from(byExercicio.entries()).map(([exercicioId, ex]) => {
      const sessoes: SessaoExercicioEvolucao[] = ex.sessaoOrder.map((sid) => {
        const s = ex.sessoes.get(sid)!;
        const melhorOrm = s.series.reduce((max, sr) => {
          const orm = calcularEstimativa1rm(sr.cargaKg, sr.repeticoes);
          return orm > max ? orm : max;
        }, 0);
        return {
          sessaoId: sid,
          dataHoraInicio: s.dataHoraInicio,
          melhorOrm: Math.round(melhorOrm * 10) / 10,
          series: s.series,
        };
      });
      return { exercicioId, exercicioNome: ex.nome, groupMuscle: ex.group, sessoes };
    });
  }

  async arquivarSessao(sessaoId: string): Promise<number> {
    return this.database.runWithChanges(
      'UPDATE sessao_treinos SET arquivado = 1, updated_at = ?, dirty = 1 WHERE id = ?',
      [nowIso(), sessaoId]
    );
  }

  async desarquivarSessao(sessaoId: string): Promise<number> {
    return this.database.runWithChanges(
      'UPDATE sessao_treinos SET arquivado = 0, updated_at = ?, dirty = 1 WHERE id = ?',
      [nowIso(), sessaoId]
    );
  }

  async deletarSessao(sessaoId: string): Promise<void> {
    // Soft delete (tombstone + dirty), nunca DELETE físico: a sessão já pode ter
    // sincronizado — sem tombstone o servidor a ressuscita no próximo pull.
    const now = nowIso();
    await this.database.withTransaction(async () => {
      // serie_segmentos ANTES da mae: o sync de C3 nao pode empurrar filhos vivos
      // de uma serie ja tombstonada (mesmo motivo de tombstoneSegmentosDe em
      // SQLiteSerieRegistradaRepository; achado #1, revisao 1).
      await this.database.run(
        `UPDATE serie_segmentos SET deleted_at = ?, updated_at = ?, dirty = 1
         WHERE deleted_at IS NULL AND serie_id IN (
           SELECT id FROM series_registradas WHERE sessao_exercicio_id IN (
             SELECT id FROM sessao_exercicios WHERE sessao_treino_id = ?
           )
         )`,
        [now, now, sessaoId]
      );
      await this.database.run(
        `UPDATE series_registradas SET deleted_at = ?, updated_at = ?, dirty = 1
         WHERE deleted_at IS NULL AND sessao_exercicio_id IN (
           SELECT id FROM sessao_exercicios WHERE sessao_treino_id = ?
         )`,
        [now, now, sessaoId]
      );
      await this.database.run(
        `UPDATE sessao_exercicios SET deleted_at = ?, updated_at = ?, dirty = 1
         WHERE deleted_at IS NULL AND sessao_treino_id = ?`,
        [now, now, sessaoId]
      );
      await this.database.run(
        `UPDATE sessao_treinos SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?`,
        [now, now, sessaoId]
      );
    });
  }

  async findSugestaoRotacao(): Promise<TreinoComUltimaSessao | null> {
    interface Row { id: string; name: string; objetivo: string | null; created_at: string; updated_at: string; ultima_sessao: string | null }
    const row = await this.database.getFirst<Row>(
      `SELECT t.id, t.name, t.objetivo, t.created_at, t.updated_at, s.ultima_sessao
       FROM treinos t
       LEFT JOIN (
         SELECT treino_id, MAX(data_hora_inicio) AS ultima_sessao
         FROM sessao_treinos WHERE status = 'finalizada' AND deleted_at IS NULL
         GROUP BY treino_id
       ) s ON t.id = s.treino_id
       WHERE t.deleted_at IS NULL AND EXISTS (SELECT 1 FROM treino_exercicios te WHERE te.treino_id = t.id AND te.deleted_at IS NULL)
       ORDER BY
         CASE WHEN s.ultima_sessao IS NULL THEN 0 ELSE 1 END ASC,
         s.ultima_sessao ASC,
         t.created_at ASC
       LIMIT 1`
    );
    if (!row) return null;
    return { id: row.id, name: row.name, objetivo: row.objetivo, createdAt: row.created_at, updatedAt: row.updated_at, ultimaSessao: row.ultima_sessao ?? null };
  }

  async findTreinoComUltimaSessao(treinoId: string): Promise<TreinoComUltimaSessao | null> {
    interface Row { id: string; name: string; objetivo: string | null; created_at: string; updated_at: string; ultima_sessao: string | null }
    const row = await this.database.getFirst<Row>(
      `SELECT t.id, t.name, t.objetivo, t.created_at, t.updated_at, s.ultima_sessao
       FROM treinos t
       LEFT JOIN (
         SELECT treino_id, MAX(data_hora_inicio) AS ultima_sessao
         FROM sessao_treinos WHERE status = 'finalizada' AND deleted_at IS NULL
         GROUP BY treino_id
       ) s ON t.id = s.treino_id
       WHERE t.id = ? AND t.deleted_at IS NULL
         AND EXISTS (SELECT 1 FROM treino_exercicios te WHERE te.treino_id = t.id AND te.deleted_at IS NULL)`,
      [treinoId]
    );
    if (!row) return null;
    return { id: row.id, name: row.name, objetivo: row.objetivo, createdAt: row.created_at, updatedAt: row.updated_at, ultimaSessao: row.ultima_sessao ?? null };
  }
}
