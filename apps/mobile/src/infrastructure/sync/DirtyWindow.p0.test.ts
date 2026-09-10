import { beforeEach, describe, expect, it } from 'vitest';

import { Treino } from '../../domain/treinos/entities/Treino';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteTreinoRepository } from '../treinos/SQLiteTreinoRepository';

/**
 * Regressão P0 (auditoria rodada 3, 2026-07-06): não existe clearDirty — o flag
 * é limpo pelo echo-back do push (o servidor devolve as linhas pushadas no
 * mesmo pull). applyServerRows regravava com INSERT OR REPLACE ... dirty=0 SEM
 * comparar updated_at: uma edição feita na janela getDirty→apply era
 * sobrescrita pela versão antiga E perdia o flag dirty → perda permanente.
 *
 * Regra LWW no cliente: a linha do servidor só sobrescreve se a linha local
 * não está dirty, OU se o updated_at do servidor é >= o local.
 */

let db: SQLiteDatabaseClient;
let repo: SQLiteTreinoRepository;

const T1 = '2026-07-06T10:00:00.000Z';
const T2 = '2026-07-06T10:00:05.000Z'; // edição local durante o round-trip

function treino(nome: string, updatedAt: string) {
  return Treino.restore({
    id: 'tr-1',
    name: nome,
    objetivo: null,
    createdAt: T1,
    updatedAt,
  });
}

beforeEach(() => {
  db = createTestDatabase();
  repo = new SQLiteTreinoRepository(db);
});

describe('applyServerRows — guarda LWW no cliente (janela dirty)', () => {
  it('echo-back NÃO sobrescreve edição local mais nova; dirty continua 1', async () => {
    await repo.save(treino('Original', T1));
    // Push aconteceu (getDirty leu a versão T1)... e o usuário edita durante o round-trip:
    await repo.save(treino('Editado durante o sync', T2));

    // Echo-back do push: mesma linha, com o updated_at antigo (T1).
    await repo.applyServerRows([{
      id: 'tr-1', name: 'Original', objetivo: null,
      createdAt: T1, updatedAt: T1, deletedAt: null,
    }]);

    const atual = await repo.findById('tr-1');
    expect(atual?.toPrimitives().name).toBe('Editado durante o sync');

    const row = await db.getFirst<{ dirty: number }>(
      'SELECT dirty FROM treinos WHERE id = ?', ['tr-1']
    );
    expect(row?.dirty).toBe(1); // a edição ainda precisa ser pushada
  });

  it('echo-back com o MESMO updated_at aplica e limpa o dirty (fluxo normal)', async () => {
    await repo.save(treino('Original', T1));

    await repo.applyServerRows([{
      id: 'tr-1', name: 'Original', objetivo: null,
      createdAt: T1, updatedAt: T1, deletedAt: null,
    }]);

    const row = await db.getFirst<{ dirty: number }>(
      'SELECT dirty FROM treinos WHERE id = ?', ['tr-1']
    );
    expect(row?.dirty).toBe(0);
  });

  it('linha do servidor mais nova sobrescreve linha local limpa', async () => {
    await repo.save(treino('Original', T1));
    await db.run('UPDATE treinos SET dirty = 0 WHERE id = ?', ['tr-1']);

    await repo.applyServerRows([{
      id: 'tr-1', name: 'Editado em outro device', objetivo: null,
      createdAt: T1, updatedAt: T2, deletedAt: null,
    }]);

    const atual = await repo.findById('tr-1');
    expect(atual?.toPrimitives().name).toBe('Editado em outro device');
  });

  it('tombstone velho do servidor não mata edição local mais nova (LWW para deletes)', async () => {
    await repo.save(treino('Editado depois do delete remoto', T2));

    await repo.applyServerRows([{
      id: 'tr-1', name: 'Original', objetivo: null,
      createdAt: T1, updatedAt: T1, deletedAt: T1,
    }]);

    const atual = await repo.findById('tr-1');
    expect(atual).not.toBeNull();
  });
});
