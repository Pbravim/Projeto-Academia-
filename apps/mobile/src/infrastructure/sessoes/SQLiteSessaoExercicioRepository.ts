import { SessaoExercicio, type SessaoExercicioPrimitives, type SubstituicaoMotivo } from '../../domain/sessoes/entities/SessaoExercicio';
import type { SessaoExercicioRepository } from '../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

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
  realizado: number;
  series_recomendadas: number | null;
  execucoes_recomendadas: number | null;
  carga_padrao: number | null;
  tempo_descanso_segundos: number | null;
  metodo: string | null;
  grupo_id: string | null;
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
        (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot, equipamento_snapshot, musculo_alvo_snapshot, realizado, series_recomendadas, execucoes_recomendadas, carga_padrao, tempo_descanso_segundos, metodo, grupo_id, substituido_por_exercicio_id, substituicao_motivo, nome_original_snapshot)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.sessaoTreinoId, p.exercicioId, p.ordem, p.nomeSnapshot, p.grupoMuscularSnapshot, p.categoriaSnapshot, p.equipamentoSnapshot, p.musculoAlvoSnapshot ?? null, p.realizado ? 1 : 0, p.seriesRecomendadas ?? null, p.execucoesRecomendadas ?? null, p.cargaPadrao ?? null, p.tempoDescansoSegundos ?? null, p.metodo, p.grupoId ?? null, p.substituidoPorExercicioId ?? null, p.substituicaoMotivo ?? null, p.nomeOriginalSnapshot ?? null]
    );
  }

  async findById(id: string): Promise<SessaoExercicio | null> {
    const row = await this.database.getFirst<SessaoExercicioRow>(
      'SELECT * FROM sessao_exercicios WHERE id = ? LIMIT 1',
      [id]
    );
    return row ? SessaoExercicio.restore(mapRow(row)) : null;
  }

  async findBySessaoIdAndExercicioId(sessaoId: string, exercicioId: string): Promise<SessaoExercicio | null> {
    const row = await this.database.getFirst<SessaoExercicioRow>(
      'SELECT * FROM sessao_exercicios WHERE sessao_treino_id = ? AND exercicio_id = ? LIMIT 1',
      [sessaoId, exercicioId]
    );
    return row ? SessaoExercicio.restore(mapRow(row)) : null;
  }

  async listBySessaoId(sessaoId: string): Promise<SessaoExercicio[]> {
    const rows = await this.database.getAll<SessaoExercicioRow>(
      'SELECT * FROM sessao_exercicios WHERE sessao_treino_id = ? ORDER BY ordem ASC',
      [sessaoId]
    );
    return rows.map((row) => SessaoExercicio.restore(mapRow(row)));
  }

  async countBySessaoId(sessaoId: string): Promise<number> {
    const row = await this.database.getFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM sessao_exercicios WHERE sessao_treino_id = ?',
      [sessaoId]
    );
    return row?.count ?? 0;
  }

  async deleteBySessaoId(sessaoId: string): Promise<void> {
    await this.database.run('DELETE FROM sessao_exercicios WHERE sessao_treino_id = ?', [sessaoId]);
  }

  async deleteByExercicioId(exercicioId: string): Promise<void> {
    await this.database.run('DELETE FROM sessao_exercicios WHERE exercicio_id = ?', [exercicioId]);
  }
}

const VALID_METODO = new Set(['normal', 'drop_set', 'piramide', 'rest_pause']);
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
    musculoAlvoSnapshot: row.musculo_alvo_snapshot ?? null,
    realizado: row.realizado === 1,
    seriesRecomendadas: row.series_recomendadas ?? null,
    execucoesRecomendadas: row.execucoes_recomendadas ?? null,
    cargaPadrao: row.carga_padrao ?? null,
    tempoDescansoSegundos: row.tempo_descanso_segundos ?? null,
    metodo: toMetodo(row.metodo),
    grupoId: row.grupo_id ?? null,
    substituidoPorExercicioId: row.substituido_por_exercicio_id ?? null,
    substituicaoMotivo: (row.substituicao_motivo as SessaoExercicioPrimitives['substituicaoMotivo']) ?? null,
    nomeOriginalSnapshot: row.nome_original_snapshot ?? null,
  };
}
