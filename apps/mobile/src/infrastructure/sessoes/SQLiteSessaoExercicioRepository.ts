import { SessaoExercicio, type SessaoExercicioPrimitives, type SubstituicaoMotivo } from '../../domain/sessoes/entities/SessaoExercicio';
import type { SessaoExercicioRepository } from '../../domain/sessoes/repositories/SessaoExercicioRepository';
import { METODOS_EXERCICIO } from '../../domain/treinos/entities/TreinoExercicio';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { nowIso } from '../../shared/utils/syncStamp';

interface SessaoExercicioRow {
  id: string;
  sessao_treino_id: string;
  exercicio_id: string;
  ordem: number;
  nome_snapshot: string;
  grupo_muscular_snapshot: string;
  categoria_snapshot: string;
  equipamento_snapshot: string | null;
  musculo_alvo_snapshot: string | null;
  movement_pattern_snapshot: string | null;
  realizado: number;
  series_recomendadas: number | null;
  execucoes_recomendadas: number | null;
  carga_padrao: number | null;
  tempo_descanso_segundos: number | null;
  metodo: string | null;
  grupo_id: string | null;
  tracking_type_snapshot: string | null;
  duracao_recomendada_segundos: number | null;
  distancia_recomendada_metros: number | null;
  intensidade_recomendada: number | null;
  substituido_por_exercicio_id: string | null;
  substituicao_motivo: string | null;
  nome_original_snapshot: string | null;
}

export class SQLiteSessaoExercicioRepository implements SessaoExercicioRepository {
  constructor(private readonly database: SQLiteDatabaseClient) {}

  async save(se: SessaoExercicio): Promise<void> {
    const p = se.toPrimitives();
    await this.database.run(
      `INSERT OR REPLACE INTO sessao_exercicios
        (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot, equipamento_snapshot, musculo_alvo_snapshot, movement_pattern_snapshot, realizado, series_recomendadas, execucoes_recomendadas, carga_padrao, tempo_descanso_segundos, metodo, grupo_id, tracking_type_snapshot, duracao_recomendada_segundos, distancia_recomendada_metros, intensidade_recomendada, substituido_por_exercicio_id, substituicao_motivo, nome_original_snapshot, updated_at, deleted_at, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1)`,
      [p.id, p.sessaoTreinoId, p.exercicioId, p.ordem, p.nomeSnapshot, p.grupoMuscularSnapshot, p.categoriaSnapshot, p.equipamentoSnapshot, JSON.stringify(p.musculoAlvoSnapshot), p.movementPatternSnapshot ?? null, p.realizado ? 1 : 0, p.seriesRecomendadas ?? null, p.execucoesRecomendadas ?? null, p.cargaPadrao ?? null, p.tempoDescansoSegundos ?? null, p.metodo, p.grupoId ?? null, p.trackingTypeSnapshot ?? null, p.duracaoRecomendadaSegundos ?? null, p.distanciaRecomendadaMetros ?? null, p.intensidadeRecomendada ?? null, p.substituidoPorExercicioId ?? null, p.substituicaoMotivo ?? null, p.nomeOriginalSnapshot ?? null, nowIso()]
    );
  }

  async findById(id: string): Promise<SessaoExercicio | null> {
    const row = await this.database.getFirst<SessaoExercicioRow>(
      'SELECT * FROM sessao_exercicios WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [id]
    );
    return row ? SessaoExercicio.restore(mapRow(row)) : null;
  }

  async findBySessaoIdAndExercicioId(sessaoId: string, exercicioId: string): Promise<SessaoExercicio | null> {
    const row = await this.database.getFirst<SessaoExercicioRow>(
      'SELECT * FROM sessao_exercicios WHERE sessao_treino_id = ? AND exercicio_id = ? AND deleted_at IS NULL LIMIT 1',
      [sessaoId, exercicioId]
    );
    return row ? SessaoExercicio.restore(mapRow(row)) : null;
  }

  async listBySessaoId(sessaoId: string): Promise<SessaoExercicio[]> {
    const rows = await this.database.getAll<SessaoExercicioRow>(
      'SELECT * FROM sessao_exercicios WHERE sessao_treino_id = ? AND deleted_at IS NULL ORDER BY ordem ASC',
      [sessaoId]
    );
    return rows.map((row) => SessaoExercicio.restore(mapRow(row)));
  }

  async countBySessaoId(sessaoId: string): Promise<number> {
    const row = await this.database.getFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM sessao_exercicios WHERE sessao_treino_id = ? AND deleted_at IS NULL',
      [sessaoId]
    );
    return row?.count ?? 0;
  }

  async deleteBySessaoId(sessaoId: string): Promise<void> {
    await this.database.run(
      'UPDATE sessao_exercicios SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE sessao_treino_id = ? AND deleted_at IS NULL',
      [nowIso(), nowIso(), sessaoId]
    );
  }

  async deleteByExercicioId(exercicioId: string): Promise<void> {
    await this.database.run(
      'UPDATE sessao_exercicios SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE exercicio_id = ? AND deleted_at IS NULL',
      [nowIso(), nowIso(), exercicioId]
    );
  }

  async getDirty(): Promise<import('@academia/contracts').SessaoExercicioSyncRow[]> {
    const rows = await this.database.getAll<{
      id: string; sessao_treino_id: string; exercicio_id: string; ordem: number;
      nome_snapshot: string; grupo_muscular_snapshot: string; categoria_snapshot: string;
      equipamento_snapshot: string | null; musculo_alvo_snapshot: string | null;
      movement_pattern_snapshot: string | null;
      nome_original_snapshot: string | null; realizado: number;
      series_recomendadas: number | null; execucoes_recomendadas: number | null;
      carga_padrao: number | null; tempo_descanso_segundos: number | null;
      metodo: string; grupo_id: string | null;
      tracking_type_snapshot: string | null;
      duracao_recomendada_segundos: number | null; distancia_recomendada_metros: number | null; intensidade_recomendada: number | null;
      substituido_por_exercicio_id: string | null; substituicao_motivo: string | null;
      updated_at: string; deleted_at: string | null;
    }>(
      // sessao_exercicios has no created_at column (the domain doesn't model one);
      // the wire's createdAt is derived from updated_at.
      `SELECT id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot,
              categoria_snapshot, equipamento_snapshot, musculo_alvo_snapshot, movement_pattern_snapshot, nome_original_snapshot,
              realizado, series_recomendadas, execucoes_recomendadas, carga_padrao, tempo_descanso_segundos,
              metodo, grupo_id, tracking_type_snapshot, duracao_recomendada_segundos, distancia_recomendada_metros, intensidade_recomendada,
              substituido_por_exercicio_id, substituicao_motivo,
              updated_at, deleted_at
       FROM sessao_exercicios WHERE dirty = 1`
    );
    return rows.map((r) => ({
      id: r.id, sessaoTreinoId: r.sessao_treino_id, exercicioId: r.exercicio_id,
      ordem: r.ordem, nomeSnapshot: r.nome_snapshot,
      grupoMuscularSnapshot: r.grupo_muscular_snapshot, categoriaSnapshot: r.categoria_snapshot,
      equipamentoSnapshot: r.equipamento_snapshot, musculoAlvoSnapshot: r.musculo_alvo_snapshot,
      nomeOriginalSnapshot: r.nome_original_snapshot, realizado: Boolean(r.realizado),
      seriesRecomendadas: r.series_recomendadas, execucoesRecomendadas: r.execucoes_recomendadas,
      cargaPadrao: r.carga_padrao, tempoDescansoSegundos: r.tempo_descanso_segundos,
      metodo: r.metodo, grupoId: r.grupo_id,
      trackingTypeSnapshot: r.tracking_type_snapshot,
      duracaoRecomendadaSegundos: r.duracao_recomendada_segundos, distanciaRecomendadaMetros: r.distancia_recomendada_metros, intensidadeRecomendada: r.intensidade_recomendada,
      substituidoPorExercicioId: r.substituido_por_exercicio_id,
      substituicaoMotivo: r.substituicao_motivo,
      createdAt: r.updated_at, updatedAt: r.updated_at, deletedAt: r.deleted_at,
    }));
  }

  async applyServerRows(rows: import('@academia/contracts').SessaoExercicioSyncRow[]): Promise<void> {
    for (const r of rows) {
      await this.database.run(
        // No created_at column on sessao_exercicios; createdAt rides on the wire only.
        // Guarda LWW: linha local dirty mais nova nunca e sobrescrita pelo echo-back.
        `INSERT INTO sessao_exercicios
           (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot,
            categoria_snapshot, equipamento_snapshot, musculo_alvo_snapshot, nome_original_snapshot,
            realizado, series_recomendadas, execucoes_recomendadas, carga_padrao, tempo_descanso_segundos,
            metodo, grupo_id, tracking_type_snapshot, duracao_recomendada_segundos, distancia_recomendada_metros, intensidade_recomendada,
            substituido_por_exercicio_id, substituicao_motivo,
            updated_at, deleted_at, dirty, server_rev)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
         ON CONFLICT(id) DO UPDATE SET
           sessao_treino_id = excluded.sessao_treino_id,
           exercicio_id = excluded.exercicio_id,
           ordem = excluded.ordem,
           nome_snapshot = excluded.nome_snapshot,
           grupo_muscular_snapshot = excluded.grupo_muscular_snapshot,
           categoria_snapshot = excluded.categoria_snapshot,
           equipamento_snapshot = excluded.equipamento_snapshot,
           musculo_alvo_snapshot = excluded.musculo_alvo_snapshot,
           nome_original_snapshot = excluded.nome_original_snapshot,
           realizado = excluded.realizado,
           series_recomendadas = excluded.series_recomendadas,
           execucoes_recomendadas = excluded.execucoes_recomendadas,
           carga_padrao = excluded.carga_padrao,
           tempo_descanso_segundos = excluded.tempo_descanso_segundos,
           metodo = excluded.metodo,
           grupo_id = excluded.grupo_id,
           tracking_type_snapshot = excluded.tracking_type_snapshot,
           duracao_recomendada_segundos = excluded.duracao_recomendada_segundos,
           distancia_recomendada_metros = excluded.distancia_recomendada_metros,
           intensidade_recomendada = excluded.intensidade_recomendada,
           substituido_por_exercicio_id = excluded.substituido_por_exercicio_id,
           substituicao_motivo = excluded.substituicao_motivo,
           updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at,
           dirty = 0,
           server_rev = 1
         WHERE sessao_exercicios.dirty = 0 OR sessao_exercicios.updated_at IS NULL OR excluded.updated_at >= sessao_exercicios.updated_at`,
        [r.id, r.sessaoTreinoId, r.exercicioId, r.ordem, r.nomeSnapshot,
         r.grupoMuscularSnapshot, r.categoriaSnapshot, r.equipamentoSnapshot,
         r.musculoAlvoSnapshot, r.nomeOriginalSnapshot, r.realizado ? 1 : 0,
         r.seriesRecomendadas, r.execucoesRecomendadas, r.cargaPadrao, r.tempoDescansoSegundos,
         r.metodo, r.grupoId, r.trackingTypeSnapshot, r.duracaoRecomendadaSegundos, r.distanciaRecomendadaMetros, r.intensidadeRecomendada,
         r.substituidoPorExercicioId, r.substituicaoMotivo,
         r.updatedAt, r.deletedAt]
      );
    }
  }
}

const VALID_METODO = new Set<string>(METODOS_EXERCICIO);
function toMetodo(v: string | null): SessaoExercicioPrimitives['metodo'] {
  return (v && VALID_METODO.has(v)) ? v as SessaoExercicioPrimitives['metodo'] : 'normal';
}

function mapRow(row: SessaoExercicioRow): SessaoExercicioPrimitives {
  return {
    id: row.id,
    sessaoTreinoId: row.sessao_treino_id,
    exercicioId: row.exercicio_id,
    ordem: row.ordem,
    nomeSnapshot: row.nome_snapshot,
    grupoMuscularSnapshot: row.grupo_muscular_snapshot,
    categoriaSnapshot: row.categoria_snapshot,
    equipamentoSnapshot: row.equipamento_snapshot,
    musculoAlvoSnapshot: row.musculo_alvo_snapshot
      ? (JSON.parse(row.musculo_alvo_snapshot) as string[])
      : [],
    movementPatternSnapshot: row.movement_pattern_snapshot ?? null,
    realizado: row.realizado === 1,
    seriesRecomendadas: row.series_recomendadas ?? null,
    execucoesRecomendadas: row.execucoes_recomendadas ?? null,
    cargaPadrao: row.carga_padrao ?? null,
    tempoDescansoSegundos: row.tempo_descanso_segundos ?? null,
    metodo: toMetodo(row.metodo),
    grupoId: row.grupo_id ?? null,
    trackingTypeSnapshot: row.tracking_type_snapshot ?? 'reps_load',
    duracaoRecomendadaSegundos: row.duracao_recomendada_segundos ?? null,
    distanciaRecomendadaMetros: row.distancia_recomendada_metros ?? null,
    intensidadeRecomendada: row.intensidade_recomendada ?? null,
    substituidoPorExercicioId: row.substituido_por_exercicio_id ?? null,
    substituicaoMotivo: (row.substituicao_motivo as SessaoExercicioPrimitives['substituicaoMotivo']) ?? null,
    nomeOriginalSnapshot: row.nome_original_snapshot ?? null,
  };
}
