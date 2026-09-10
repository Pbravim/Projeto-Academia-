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

function make(id: string): SessaoTreino {
  return SessaoTreino.restore({
    id, treinoId: 'tr1', treinoNomeSnapshot: 'Treino A',
    dataHoraInicio: '2026-01-01T10:00:00.000Z', dataHoraFim: null, status: 'em_andamento',
  });
}

describe('SQLiteSessaoTreinoRepository soft-delete', () => {
  it('delete tombstones and findById/findAtiva hide it', async () => {
    await repo.save(make('s1'));
    await repo.delete('s1');
    expect(await repo.findById('s1')).toBeNull();
    expect(await repo.findAtiva()).toBeNull();
    const row = await db.getFirst<{ deleted_at: string | null }>(
      'SELECT deleted_at FROM sessao_treinos WHERE id = ?', ['s1']
    );
    expect(row?.deleted_at).toMatch(/Z$/);
  });

  it('deleteByTreinoId tombstones matching sessions', async () => {
    await repo.save(make('s1'));
    await repo.deleteByTreinoId('tr1');
    expect(await repo.findById('s1')).toBeNull();
  });
});
