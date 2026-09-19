import { beforeEach, describe, expect, it } from 'vitest';

import { SessaoTreino } from '../../domain/sessoes/entities/SessaoTreino';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

import { SQLiteSessaoTreinoRepository } from './SQLiteSessaoTreinoRepository';

let db: SQLiteDatabaseClient;
let repo: SQLiteSessaoTreinoRepository;

beforeEach(() => {
  db = createTestDatabase();
  repo = new SQLiteSessaoTreinoRepository(db);
});

describe('SQLiteSessaoTreinoRepository — save preserva arquivado e server_rev (#54)', () => {
  it('re-save nao zera arquivado/server_rev setados por fora (ex.: sync)', async () => {
    const sessao = SessaoTreino.create({
      id: 's-54', treinoId: null, treinoNomeSnapshot: 'Treino livre',
      dataHoraInicio: new Date('2026-09-19T10:00:00.000Z'),
    });
    await repo.save(sessao);

    await db.run('UPDATE sessao_treinos SET arquivado = 1, server_rev = 5 WHERE id = ?', ['s-54']);

    const finalizada = sessao.finalizar(new Date('2026-09-19T11:00:00.000Z'));
    await repo.save(finalizada);

    const row = await db.getFirst<{
      arquivado: number; server_rev: number; status: string; dirty: number; deleted_at: string | null;
    }>('SELECT arquivado, server_rev, status, dirty, deleted_at FROM sessao_treinos WHERE id = ?', ['s-54']);

    expect(row).toEqual({ arquivado: 1, server_rev: 5, status: 'finalizada', dirty: 1, deleted_at: null });
  });
});
