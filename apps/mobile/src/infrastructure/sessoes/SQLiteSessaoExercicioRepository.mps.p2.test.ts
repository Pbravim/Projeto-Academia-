import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteSessaoExercicioRepository } from './SQLiteSessaoExercicioRepository';

/**
 * Regressão P2 (auditoria rodada 3, apêndice C): movement_pattern_snapshot
 * existia no mobile mas não no contrato — um device restaurado ficava com NULL
 * e a sugestão de substituto degradava silenciosamente.
 */

const T = '2026-07-01T10:00:00.000Z';

let db: SQLiteDatabaseClient;
let repo: SQLiteSessaoExercicioRepository;

beforeEach(async () => {
  db = createTestDatabase();
  repo = new SQLiteSessaoExercicioRepository(db);
  await db.run(
    `INSERT INTO treinos (id, name, created_at, updated_at) VALUES ('tr-1', 'Treino A', ?, ?)`,
    [T, T],
  );
  await db.run(
    `INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, status, updated_at, dirty)
     VALUES ('st-1', 'tr-1', 'Treino A', ?, 'finalizada', ?, 0)`,
    [T, T],
  );
});

describe('movement_pattern_snapshot no wire de sync', () => {
  it('getDirty inclui o movementPatternSnapshot', async () => {
    await db.run(
      `INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot,
        grupo_muscular_snapshot, categoria_snapshot, movement_pattern_snapshot, updated_at, dirty)
       VALUES ('se-1', 'st-1', 'ex-1', 1, 'Supino', 'Peito', 'Composto', 'Horizontal Push', ?, 1)`,
      [T],
    );

    const dirty = await repo.getDirty();

    expect(dirty).toHaveLength(1);
    expect(dirty[0].movementPatternSnapshot).toBe('Horizontal Push');
  });

  it('applyServerRows grava o movementPatternSnapshot (restore não perde o campo)', async () => {
    await repo.applyServerRows([{
      id: 'se-2', sessaoTreinoId: 'st-1', exercicioId: 'ex-1', ordem: 1,
      nomeSnapshot: 'Remada', grupoMuscularSnapshot: 'Costas', categoriaSnapshot: 'Composto',
      equipamentoSnapshot: null, musculoAlvoSnapshot: null, nomeOriginalSnapshot: null,
      movementPatternSnapshot: 'Horizontal Pull',
      realizado: true, seriesRecomendadas: null, execucoesRecomendadas: null,
      cargaPadrao: null, tempoDescansoSegundos: null, metodo: 'normal', grupoId: null,
      substituidoPorExercicioId: null, substituicaoMotivo: null,
      trackingTypeSnapshot: null, duracaoRecomendadaSegundos: null,
      distanciaRecomendadaMetros: null, intensidadeRecomendada: null,
      createdAt: T, updatedAt: T, deletedAt: null,
    }]);

    const row = await db.getFirst<{ movement_pattern_snapshot: string | null }>(
      `SELECT movement_pattern_snapshot FROM sessao_exercicios WHERE id = 'se-2'`,
    );
    expect(row?.movement_pattern_snapshot).toBe('Horizontal Pull');
  });
});
