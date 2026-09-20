import { beforeEach, describe, expect, it } from 'vitest';

import { RegistroPeso } from '../../domain/peso/entities/RegistroPeso';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

import { SQLiteRegistroPesoRepository } from './SQLiteRegistroPesoRepository';

let db: SQLiteDatabaseClient;
let repo: SQLiteRegistroPesoRepository;

beforeEach(() => {
  db = createTestDatabase();
  repo = new SQLiteRegistroPesoRepository(db);
});

interface SavedRow {
  peso_kg: number; data_registro: string; observacao: string | null;
  server_rev: number; dirty: number; deleted_at: string | null; updated_at: string;
}

const SELECT_ROW = 'SELECT peso_kg, data_registro, observacao, server_rev, dirty, deleted_at, updated_at FROM registros_peso WHERE id = ?';

describe('SQLiteRegistroPesoRepository — save preserva server_rev no re-save (#62)', () => {
  it('re-save aplica TODAS as colunas do domínio e preserva server_rev setado por fora (ex.: sync)', async () => {
    const registro = RegistroPeso.create({
      id: 'rp-62', pesoKg: 80, dataRegistro: new Date('2026-09-19T10:00:00.000Z'), observacao: 'manha',
    });
    await repo.save(registro);

    await db.run(
      "UPDATE registros_peso SET server_rev = 5, dirty = 0, updated_at = '2000-01-01T00:00:00.000Z' WHERE id = ?",
      ['rp-62']
    );

    const atualizado = RegistroPeso.restore({
      id: 'rp-62', pesoKg: 79.5, dataRegistro: '2026-09-19T11:00:00.000Z', observacao: 'noite',
    });
    await repo.save(atualizado);

    const row = await db.getFirst<SavedRow>(SELECT_ROW, ['rp-62']);

    expect(row?.peso_kg).toBe(79.5);
    expect(row?.data_registro).toBe('2026-09-19T11:00:00.000Z');
    expect(row?.observacao).toBe('noite');
    expect(row?.server_rev).toBe(5);
    expect(row?.dirty).toBe(1);
    expect(row?.deleted_at).toBeNull();
    expect(row?.updated_at).not.toBe('2000-01-01T00:00:00.000Z');
  });
});
