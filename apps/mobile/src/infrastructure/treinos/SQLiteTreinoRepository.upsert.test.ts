import { beforeEach, describe, expect, it } from 'vitest';

import { Treino } from '../../domain/treinos/entities/Treino';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

import { SQLiteTreinoRepository } from './SQLiteTreinoRepository';

let db: SQLiteDatabaseClient;
let repo: SQLiteTreinoRepository;

beforeEach(() => {
  db = createTestDatabase();
  repo = new SQLiteTreinoRepository(db);
});

interface SavedRow {
  name: string; objetivo: string | null; server_rev: number; dirty: number;
  deleted_at: string | null; updated_at: string;
}

const SELECT_ROW = 'SELECT name, objetivo, server_rev, dirty, deleted_at, updated_at FROM treinos WHERE id = ?';

describe('SQLiteTreinoRepository — save preserva server_rev no re-save (#62)', () => {
  it('re-save aplica TODAS as colunas do domínio e preserva server_rev setado por fora (ex.: sync)', async () => {
    const treino = Treino.create({ id: 't-62', name: 'Treino A', objetivo: 'Hipertrofia', createdAt: new Date('2026-09-19T10:00:00.000Z') });
    await repo.save(treino);

    // Simula linha ja sincronizada (dirty = 0, updated_at antigo) com metadado de
    // servidor que o save() local nao deve zerar (server_rev).
    await db.run(
      "UPDATE treinos SET server_rev = 5, dirty = 0, updated_at = '2000-01-01T00:00:00.000Z' WHERE id = ?",
      ['t-62']
    );

    const atualizado = Treino.update(treino.toPrimitives(), { name: 'Treino B', objetivo: 'Emagrecimento' }, new Date('2026-09-19T11:00:00.000Z'));
    await repo.save(atualizado);

    const row = await db.getFirst<SavedRow>(SELECT_ROW, ['t-62']);

    expect(row?.name).toBe('Treino B');
    expect(row?.objetivo).toBe('Emagrecimento');
    expect(row?.server_rev).toBe(5);
    expect(row?.dirty).toBe(1);
    expect(row?.deleted_at).toBeNull();
    expect(row?.updated_at).not.toBe('2000-01-01T00:00:00.000Z');
  });
});
