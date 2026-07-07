import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteExerciseRepository } from './SQLiteExerciseRepository';
import type { ExerciseSyncRow } from '@academia/contracts';

/**
 * Regressão P2 (auditoria rodada 3, apêndice C): devices A e B criam cada um
 * "Remada Especial" (ids distintos, mesmo normalized_name). No pull, o
 * UNIQUE(normalized_name) estourava — antes o REPLACE apagava o custom local em
 * silêncio; depois do UPSERT por id, o INSERT falha e aborta o sync inteiro.
 * Nenhum dos dois pode acontecer: o conflito precisa de rename explícito.
 */

const T = '2026-07-01T10:00:00.000Z';

let db: SQLiteDatabaseClient;
let repo: SQLiteExerciseRepository;

const serverRow = (overrides: Partial<ExerciseSyncRow>): ExerciseSyncRow => ({
  id: 'srv-1', name: 'Remada Especial', normalizedName: 'remada especial',
  groupMuscle: 'Costas', category: 'Composto', equipment: null, loadUnit: 'kg',
  isCustom: true, mediaOnline: null, mediaLocal: null, musculoAlvo: null,
  movementPattern: null, stabilizers: null, executionType: null, nameVariations: null,
  primaryEquipment: null, secondaryEquipment: null, catalogVersion: 0, trackingType: null,
  createdAt: T, updatedAt: T, deletedAt: null,
  ...overrides,
});

beforeEach(async () => {
  db = createTestDatabase();
  repo = new SQLiteExerciseRepository(db);
});

describe('colisão de normalized_name no pull', () => {
  it('custom local homônimo é renomeado (dirty=1) e ambos sobrevivem', async () => {
    await db.run(
      `INSERT INTO exercises (id, name, normalized_name, group_muscle, category, load_unit, is_custom, created_at, updated_at, dirty)
       VALUES ('loc-1', 'Remada Especial', 'remada especial', 'Costas', 'Composto', 'kg', 1, ?, ?, 0)`,
      [T, T],
    );

    await repo.applyServerRows([serverRow({})]);

    const rows = await db.getAll<{ id: string; normalized_name: string; dirty: number; deleted_at: string | null }>(
      `SELECT id, normalized_name, dirty, deleted_at FROM exercises WHERE id IN ('loc-1','srv-1')`,
    );
    expect(rows).toHaveLength(2); // nenhum dos dois foi apagado
    const local = rows.find((r) => r.id === 'loc-1')!;
    const srv = rows.find((r) => r.id === 'srv-1')!;
    expect(local.normalized_name).not.toBe(srv.normalized_name); // rename resolveu o UNIQUE
    expect(local.dirty).toBe(1); // o rename precisa ser pushado
    expect(srv.normalized_name).toBe('remada especial'); // a linha do servidor fica canônica
  });

  it('colisão com exercício de CATÁLOGO não renomeia o catálogo: o custom incoming ganha sufixo', async () => {
    await db.run(
      `INSERT INTO exercises (id, name, normalized_name, group_muscle, category, load_unit, is_custom, created_at, updated_at, dirty)
       VALUES ('cat-1', 'Supino Reto', 'supino reto', 'Peito', 'Composto', 'kg', 0, ?, ?, 0)`,
      [T, T],
    );

    await repo.applyServerRows([serverRow({ id: 'srv-2', name: 'Supino Reto', normalizedName: 'supino reto' })]);

    const catalogo = await db.getFirst<{ normalized_name: string; dirty: number }>(
      `SELECT normalized_name, dirty FROM exercises WHERE id = 'cat-1'`,
    );
    expect(catalogo?.normalized_name).toBe('supino reto'); // catálogo intocado
    expect(catalogo?.dirty).toBe(0);

    const incoming = await db.getFirst<{ normalized_name: string }>(
      `SELECT normalized_name FROM exercises WHERE id = 'srv-2'`,
    );
    expect(incoming).not.toBeNull(); // o custom materializou mesmo assim
    expect(incoming!.normalized_name).not.toBe('supino reto');
  });
});
