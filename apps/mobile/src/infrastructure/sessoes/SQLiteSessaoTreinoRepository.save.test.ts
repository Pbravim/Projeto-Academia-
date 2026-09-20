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

interface SavedRow {
  arquivado: number; server_rev: number; status: string; dirty: number; deleted_at: string | null;
  data_hora_fim: string | null; updated_at: string; treino_nome_snapshot: string;
}

const SELECT_ROW = `SELECT arquivado, server_rev, status, dirty, deleted_at, data_hora_fim, updated_at, treino_nome_snapshot
                     FROM sessao_treinos WHERE id = ?`;

describe('SQLiteSessaoTreinoRepository — save preserva arquivado e server_rev (#54)', () => {
  it('re-save aplica TODAS as colunas do upsert e preserva arquivado/server_rev setados por fora (ex.: sync)', async () => {
    const sessao = SessaoTreino.create({
      id: 's-54', treinoId: null, treinoNomeSnapshot: 'Treino livre',
      dataHoraInicio: new Date('2026-09-19T10:00:00.000Z'),
    });
    await repo.save(sessao);

    // Simula linha ja sincronizada (dirty = 0, updated_at antigo) com metadados de
    // servidor que o save() local nao deve tocar (arquivado, server_rev).
    await db.run(
      "UPDATE sessao_treinos SET arquivado = 1, server_rev = 5, dirty = 0, updated_at = '2000-01-01T00:00:00.000Z' WHERE id = ?",
      ['s-54']
    );

    const finalizada = sessao.finalizar(new Date('2026-09-19T11:00:00.000Z'));
    await repo.save(finalizada);

    const row = await db.getFirst<SavedRow>(SELECT_ROW, ['s-54']);

    expect(row?.arquivado).toBe(1);
    expect(row?.server_rev).toBe(5);
    expect(row?.status).toBe('finalizada');
    expect(row?.data_hora_fim).toBe('2026-09-19T11:00:00.000Z');
    expect(row?.dirty).toBe(1);
    expect(row?.deleted_at).toBeNull();
    expect(row?.updated_at).not.toBe('2000-01-01T00:00:00.000Z');
  });

  it('re-save com treinoNomeSnapshot novo (caminho SalvarSessaoComoTreinoUseCase) atualiza o snapshot e preserva arquivado/server_rev', async () => {
    const sessao = SessaoTreino.create({
      id: 's-54b', treinoId: null, treinoNomeSnapshot: 'Treino livre',
      dataHoraInicio: new Date('2026-09-19T10:00:00.000Z'),
    });
    await repo.save(sessao);

    await db.run('UPDATE sessao_treinos SET arquivado = 1, server_rev = 5 WHERE id = ?', ['s-54b']);

    const comNomeNovo = SessaoTreino.restore({ ...sessao.toPrimitives(), treinoNomeSnapshot: 'Novo nome' });
    await repo.save(comNomeNovo);

    const row = await db.getFirst<SavedRow>(SELECT_ROW, ['s-54b']);

    expect(row?.treino_nome_snapshot).toBe('Novo nome');
    expect(row?.arquivado).toBe(1);
    expect(row?.server_rev).toBe(5);
  });

  it('re-save com treinoId e dataHoraInicio novos (#66) atualiza as duas colunas no upsert', async () => {
    const sessao = SessaoTreino.create({
      id: 's-66', treinoId: null, treinoNomeSnapshot: 'Treino livre',
      dataHoraInicio: new Date('2026-09-19T10:00:00.000Z'),
    });
    await repo.save(sessao);

    await db.run('UPDATE sessao_treinos SET server_rev = 5 WHERE id = ?', ['s-66']);

    const comNovosCampos = SessaoTreino.restore({
      ...sessao.toPrimitives(),
      treinoId: 'outro-treino',
      dataHoraInicio: '2026-09-20T09:00:00.000Z',
    });
    await repo.save(comNovosCampos);

    const row = await db.getFirst<{ treino_id: string | null; data_hora_inicio: string; server_rev: number }>(
      'SELECT treino_id, data_hora_inicio, server_rev FROM sessao_treinos WHERE id = ?',
      ['s-66'],
    );

    expect(row?.treino_id).toBe('outro-treino');
    expect(row?.data_hora_inicio).toBe('2026-09-20T09:00:00.000Z');
    expect(row?.server_rev).toBe(5);
  });
});
