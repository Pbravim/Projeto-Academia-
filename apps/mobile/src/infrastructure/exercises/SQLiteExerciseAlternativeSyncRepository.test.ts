import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

import { SQLiteExerciseAlternativeSyncRepository } from './SQLiteExerciseAlternativeSyncRepository';

/**
 * Regressão P2 (rodada 3, apêndice C): exercise_alternatives marcava dirty mas
 * estava fora do contrato — links custom nunca sincavam e sumiam no restore.
 */

const T1 = '2026-07-01T10:00:00.000Z';
const T2 = '2026-07-01T12:00:00.000Z';

let db: SQLiteDatabaseClient;
let repo: SQLiteExerciseAlternativeSyncRepository;

const seedExercise = async (id: string) => {
  await db.run(
    `INSERT INTO exercises (id, name, normalized_name, group_muscle, category, load_unit, is_custom, created_at, updated_at, dirty)
     VALUES (?, ?, ?, 'Peito', 'Composto', 'kg', 1, ?, ?, 0)`,
    [id, id, id, T1, T1],
  );
};

beforeEach(async () => {
  db = createTestDatabase();
  repo = new SQLiteExerciseAlternativeSyncRepository(db);
  await seedExercise('ex-a');
  await seedExercise('ex-b');
});

describe('getDirty', () => {
  it('devolve os vínculos dirty no formato do wire', async () => {
    await db.run(
      `INSERT INTO exercise_alternatives (exercicio_id, alternativa_id, updated_at, deleted_at, dirty)
       VALUES ('ex-a', 'ex-b', ?, NULL, 1)`,
      [T1],
    );

    const dirty = await repo.getDirty();

    expect(dirty).toEqual([
      { exercicioId: 'ex-a', alternativaId: 'ex-b', updatedAt: T1, deletedAt: null },
    ]);
  });
});

describe('applyServerRows', () => {
  it('insere vínculo novo do servidor com dirty=0', async () => {
    await repo.applyServerRows([
      { exercicioId: 'ex-a', alternativaId: 'ex-b', updatedAt: T1, deletedAt: null },
    ]);

    const row = await db.getFirst<{ dirty: number; deleted_at: string | null }>(
      `SELECT dirty, deleted_at FROM exercise_alternatives WHERE exercicio_id = 'ex-a' AND alternativa_id = 'ex-b'`,
    );
    expect(row).not.toBeNull();
    expect(row!.dirty).toBe(0);
  });

  it('aplica tombstone do servidor sobre linha local limpa', async () => {
    await db.run(
      `INSERT INTO exercise_alternatives (exercicio_id, alternativa_id, updated_at, deleted_at, dirty)
       VALUES ('ex-a', 'ex-b', ?, NULL, 0)`,
      [T1],
    );

    await repo.applyServerRows([
      { exercicioId: 'ex-a', alternativaId: 'ex-b', updatedAt: T2, deletedAt: T2 },
    ]);

    const row = await db.getFirst<{ deleted_at: string | null }>(
      `SELECT deleted_at FROM exercise_alternatives WHERE exercicio_id = 'ex-a' AND alternativa_id = 'ex-b'`,
    );
    expect(row!.deleted_at).toBe(T2);
  });

  it('LWW: echo-back antigo não sobrescreve edição local dirty mais nova', async () => {
    await db.run(
      `INSERT INTO exercise_alternatives (exercicio_id, alternativa_id, updated_at, deleted_at, dirty)
       VALUES ('ex-a', 'ex-b', ?, ?, 1)`,
      [T2, T2], // remoção local mais nova, ainda não pushada
    );

    await repo.applyServerRows([
      { exercicioId: 'ex-a', alternativaId: 'ex-b', updatedAt: T1, deletedAt: null },
    ]);

    const row = await db.getFirst<{ deleted_at: string | null; dirty: number }>(
      `SELECT deleted_at, dirty FROM exercise_alternatives WHERE exercicio_id = 'ex-a' AND alternativa_id = 'ex-b'`,
    );
    expect(row!.deleted_at).toBe(T2); // remoção local preservada
    expect(row!.dirty).toBe(1); // ainda pendente de push
  });

  it('pula vínculo cujo exercício não existe localmente (não aborta o pull)', async () => {
    await expect(
      repo.applyServerRows([
        { exercicioId: 'ex-inexistente', alternativaId: 'ex-b', updatedAt: T1, deletedAt: null },
      ]),
    ).resolves.toBeUndefined();

    const rows = await db.getAll(`SELECT * FROM exercise_alternatives`);
    expect(rows).toHaveLength(0);
  });
});
