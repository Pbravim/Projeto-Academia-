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

function makeLivre(id: string): SessaoTreino {
  return SessaoTreino.create({
    id, treinoId: null, treinoNomeSnapshot: 'Treino livre 13/09',
    dataHoraInicio: new Date('2026-09-13T10:00:00.000Z'),
  });
}

describe('SQLiteSessaoTreinoRepository — sessao sem treino (#33)', () => {
  it('save grava treino_id NULL e findById devolve treinoId null', async () => {
    await repo.save(makeLivre('sl-1'));
    const found = await repo.findById('sl-1');
    expect(found?.toPrimitives().treinoId).toBeNull();
  });

  it('findAtiva devolve treinoId null para sessao livre ativa', async () => {
    await repo.save(makeLivre('sl-1'));
    const ativa = await repo.findAtiva();
    expect(ativa?.toPrimitives().treinoId).toBeNull();
  });

  it('getDirty devolve treinoId null no wire', async () => {
    await repo.save(makeLivre('sl-1'));
    const dirty = await repo.getDirty();
    const row = dirty.find((r) => r.id === 'sl-1');
    expect(row?.treinoId).toBeNull();
  });

  it('applyServerRows com treinoId null grava null e findById reflete', async () => {
    const now = '2026-09-13T10:00:00.000Z';
    await repo.applyServerRows([{
      id: 'sl-2', treinoId: null, treinoNomeSnapshot: 'Treino livre servidor',
      dataHoraInicio: now, dataHoraFim: null, status: 'em_andamento', arquivado: false,
      createdAt: now, updatedAt: now, deletedAt: null,
    }]);
    const found = await repo.findById('sl-2');
    expect(found?.toPrimitives().treinoId).toBeNull();
  });
});
