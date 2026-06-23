import { TreinoExercicio, METODOS_EXERCICIO, type TreinoExercicioPrimitives, type MetodoExercicio } from '../../domain/treinos/entities/TreinoExercicio';
import type { TreinoExercicioRepository } from '../../domain/treinos/repositories/TreinoExercicioRepository';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { nowIso } from '../../shared/utils/syncStamp';

interface TreinoExercicioRow {
  id: string;
  treino_id: string;
  exercicio_id: string;
  ordem: number;
  series_recomendadas: number | null;
  execucoes_recomendadas: number | null;
  carga_padrao: number | null;
  tempo_descanso_segundos: number | null;
  metodo: string | null;
  grupo_id: string | null;
  duracao_recomendada_segundos: number | null;
  distancia_recomendada_metros: number | null;
  intensidade_recomendada: number | null;
}

export class SQLiteTreinoExercicioRepository implements TreinoExercicioRepository {
  constructor(private readonly database: SQLiteDatabaseClient) {}

  async save(treinoExercicio: TreinoExercicio): Promise<void> {
    const p = treinoExercicio.toPrimitives();

    await this.database.run(
      `INSERT OR REPLACE INTO treino_exercicios (id, treino_id, exercicio_id, ordem, series_recomendadas, execucoes_recomendadas, carga_padrao, tempo_descanso_segundos, metodo, grupo_id, duracao_recomendada_segundos, distancia_recomendada_metros, intensidade_recomendada, updated_at, deleted_at, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1)`,
      [p.id, p.treinoId, p.exercicioId, p.ordem, p.seriesRecomendadas ?? null, p.execucoesRecomendadas ?? null, p.cargaPadrao ?? null, p.tempoDescansoSegundos ?? null, p.metodo, p.grupoId ?? null, p.duracaoRecomendadaSegundos ?? null, p.distanciaRecomendadaMetros ?? null, p.intensidadeRecomendada ?? null, nowIso()]
    );
  }

  async listByTreinoId(treinoId: string): Promise<TreinoExercicio[]> {
    const rows = await this.database.getAll<TreinoExercicioRow>(
      'SELECT id, treino_id, exercicio_id, ordem, series_recomendadas, execucoes_recomendadas, carga_padrao, tempo_descanso_segundos, metodo, grupo_id, duracao_recomendada_segundos, distancia_recomendada_metros, intensidade_recomendada FROM treino_exercicios WHERE treino_id = ? AND deleted_at IS NULL ORDER BY ordem ASC',
      [treinoId]
    );

    return rows.map((row) => TreinoExercicio.restore(mapRowToPrimitives(row)));
  }

  async findById(id: string): Promise<TreinoExercicio | null> {
    const row = await this.database.getFirst<TreinoExercicioRow>(
      'SELECT id, treino_id, exercicio_id, ordem, series_recomendadas, execucoes_recomendadas, carga_padrao, tempo_descanso_segundos, metodo, grupo_id, duracao_recomendada_segundos, distancia_recomendada_metros, intensidade_recomendada FROM treino_exercicios WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [id]
    );

    return row ? TreinoExercicio.restore(mapRowToPrimitives(row)) : null;
  }

  async findByTreinoIdAndExercicioId(
    treinoId: string,
    exercicioId: string
  ): Promise<TreinoExercicio | null> {
    const row = await this.database.getFirst<TreinoExercicioRow>(
      'SELECT id, treino_id, exercicio_id, ordem, series_recomendadas, execucoes_recomendadas, carga_padrao, tempo_descanso_segundos, metodo, grupo_id, duracao_recomendada_segundos, distancia_recomendada_metros, intensidade_recomendada FROM treino_exercicios WHERE treino_id = ? AND exercicio_id = ? AND deleted_at IS NULL LIMIT 1',
      [treinoId, exercicioId]
    );

    return row ? TreinoExercicio.restore(mapRowToPrimitives(row)) : null;
  }

  async countByTreinoId(treinoId: string): Promise<number> {
    const row = await this.database.getFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM treino_exercicios WHERE treino_id = ? AND deleted_at IS NULL',
      [treinoId]
    );

    return row?.count ?? 0;
  }

  async countAllByTreino(): Promise<Record<string, number>> {
    const rows = await this.database.getAll<{ treino_id: string; count: number }>(
      'SELECT treino_id, COUNT(*) as count FROM treino_exercicios WHERE deleted_at IS NULL GROUP BY treino_id',
      []
    );

    return Object.fromEntries(rows.map((r) => [r.treino_id, r.count]));
  }

  async updateOrdem(id: string, ordem: number): Promise<void> {
    await this.database.run(
      'UPDATE treino_exercicios SET ordem = ?, updated_at = ?, dirty = 1 WHERE id = ?',
      [ordem, nowIso(), id]
    );
  }

  async updateRecomendacoes(id: string, seriesRecomendadas: number | null, execucoesRecomendadas: number | null, cargaPadrao: number | null, tempoDescansoSegundos: number | null): Promise<void> {
    await this.database.run(
      'UPDATE treino_exercicios SET series_recomendadas = ?, execucoes_recomendadas = ?, carga_padrao = ?, tempo_descanso_segundos = ?, updated_at = ?, dirty = 1 WHERE id = ?',
      [seriesRecomendadas ?? null, execucoesRecomendadas ?? null, cargaPadrao ?? null, tempoDescansoSegundos ?? null, nowIso(), id]
    );
  }

  async updateMetodoGrupo(id: string, metodo: MetodoExercicio, grupoId: string | null): Promise<void> {
    await this.database.run(
      'UPDATE treino_exercicios SET metodo = ?, grupo_id = ?, updated_at = ?, dirty = 1 WHERE id = ?',
      [metodo, grupoId ?? null, nowIso(), id]
    );
  }

  async delete(id: string): Promise<void> {
    await this.database.run('UPDATE treino_exercicios SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?', [nowIso(), nowIso(), id]);
  }

  async deleteByTreinoId(treinoId: string): Promise<void> {
    await this.database.run('UPDATE treino_exercicios SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE treino_id = ? AND deleted_at IS NULL', [nowIso(), nowIso(), treinoId]);
  }

  async deleteByExercicioId(exercicioId: string): Promise<void> {
    await this.database.run('UPDATE treino_exercicios SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE exercicio_id = ? AND deleted_at IS NULL', [nowIso(), nowIso(), exercicioId]);
  }

  async getDirty(): Promise<import('@academia/contracts').TreinoExercicioSyncRow[]> {
    const rows = await this.database.getAll<{
      id: string; treino_id: string; exercicio_id: string; ordem: number;
      series_recomendadas: number | null; execucoes_recomendadas: number | null;
      carga_padrao: number | null; tempo_descanso_segundos: number | null;
      metodo: string; grupo_id: string | null;
      duracao_recomendada_segundos: number | null; distancia_recomendada_metros: number | null; intensidade_recomendada: number | null;
      updated_at: string | null; deleted_at: string | null;
    }>(
      `SELECT id, treino_id, exercicio_id, ordem, series_recomendadas, execucoes_recomendadas,
              carga_padrao, tempo_descanso_segundos, metodo, grupo_id,
              duracao_recomendada_segundos, distancia_recomendada_metros, intensidade_recomendada,
              updated_at, deleted_at
       FROM treino_exercicios WHERE dirty = 1`
    );
    return rows.map((r) => ({
      id: r.id, treinoId: r.treino_id, exercicioId: r.exercicio_id, ordem: r.ordem,
      seriesRecomendadas: r.series_recomendadas, execucoesRecomendadas: r.execucoes_recomendadas,
      cargaPadrao: r.carga_padrao, tempoDescansoSegundos: r.tempo_descanso_segundos,
      metodo: r.metodo, grupoId: r.grupo_id,
      duracaoRecomendadaSegundos: r.duracao_recomendada_segundos, distanciaRecomendadaMetros: r.distancia_recomendada_metros, intensidadeRecomendada: r.intensidade_recomendada,
      updatedAt: r.updated_at ?? new Date().toISOString(), deletedAt: r.deleted_at,
    }));
  }

  async applyServerRows(rows: import('@academia/contracts').TreinoExercicioSyncRow[]): Promise<void> {
    for (const r of rows) {
      await this.database.run(
        `INSERT OR REPLACE INTO treino_exercicios
           (id, treino_id, exercicio_id, ordem, series_recomendadas, execucoes_recomendadas,
            carga_padrao, tempo_descanso_segundos, metodo, grupo_id, duracao_recomendada_segundos,
            distancia_recomendada_metros, intensidade_recomendada, updated_at, deleted_at, dirty, server_rev)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
        [r.id, r.treinoId, r.exercicioId, r.ordem, r.seriesRecomendadas, r.execucoesRecomendadas,
         r.cargaPadrao, r.tempoDescansoSegundos, r.metodo, r.grupoId, r.duracaoRecomendadaSegundos, r.distanciaRecomendadaMetros, r.intensidadeRecomendada, r.updatedAt, r.deletedAt]
      );
    }
  }
}

const VALID_METODO = new Set<string>(METODOS_EXERCICIO);
function toMetodo(v: string | null): MetodoExercicio {
  return (v && VALID_METODO.has(v)) ? v as MetodoExercicio : 'normal';
}

function mapRowToPrimitives(row: TreinoExercicioRow): TreinoExercicioPrimitives {
  return {
    id: row.id,
    treinoId: row.treino_id,
    exercicioId: row.exercicio_id,
    ordem: row.ordem,
    seriesRecomendadas: row.series_recomendadas ?? null,
    execucoesRecomendadas: row.execucoes_recomendadas ?? null,
    cargaPadrao: row.carga_padrao ?? null,
    tempoDescansoSegundos: row.tempo_descanso_segundos ?? null,
    metodo: toMetodo(row.metodo),
    grupoId: row.grupo_id ?? null,
    duracaoRecomendadaSegundos: row.duracao_recomendada_segundos ?? null,
    distanciaRecomendadaMetros: row.distancia_recomendada_metros ?? null,
    intensidadeRecomendada: row.intensidade_recomendada ?? null,
  };
}
