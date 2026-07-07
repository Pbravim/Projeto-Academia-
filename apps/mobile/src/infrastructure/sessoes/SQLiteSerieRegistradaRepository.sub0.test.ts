import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteSerieRegistradaRepository } from './SQLiteSerieRegistradaRepository';
import { SerieRegistrada } from '../../domain/sessoes/entities/SerieRegistrada';

let db: SQLiteDatabaseClient;
let repo: SQLiteSerieRegistradaRepository;

beforeEach(async () => {
  db = createTestDatabase();
  repo = new SQLiteSerieRegistradaRepository(db);
  await seedSessaoExercicio(db);
});

// linhas-pais exigidas pelas FKs reais (sessao_treinos -> sessao_exercicios)
async function seedSessaoExercicio(target: SQLiteDatabaseClient): Promise<void> {
  await target.run(
    `INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, status)
     VALUES ('s1', 'tr1', 'Treino Teste', '2026-07-01T10:00:00.000Z', 'em_andamento')`
  );
  await target.run(
    `INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot)
     VALUES ('se1', 's1', 'e1', 0, 'X', 'Peito', 'Composto')`
  );
}

function make(id: string, seId: string): SerieRegistrada {
  return SerieRegistrada.restore({
    id, sessaoExercicioId: seId, ordem: 0, cargaKg: 50, repeticoes: 10,
    observacao: null, tipoSerie: 'valida', duracaoSegundos: null, distanciaMetros: null, intensidade: null,
  });
}

describe('SQLiteSerieRegistradaRepository soft-delete', () => {
  it('delete tombstones; reads hide it', async () => {
    await repo.save(make('sr1', 'se1'));
    await repo.delete('sr1');
    expect(await repo.findById('sr1')).toBeNull();
    expect(await repo.listBySessaoExercicioId('se1')).toHaveLength(0);
    expect(await repo.countBySessaoExercicioId('se1')).toBe(0);
  });

  it('maxOrdemBySessaoExercicioId counts soft-deleted rows so ordem is never reused', async () => {
    const withOrdem = (id: string, ordem: number) =>
      SerieRegistrada.restore({
        id, sessaoExercicioId: 'se1', ordem, cargaKg: 50, repeticoes: 10,
        observacao: null, tipoSerie: 'valida', duracaoSegundos: null, distanciaMetros: null, intensidade: null,
      });
    await repo.save(withOrdem('sr1', 1));
    await repo.save(withOrdem('sr2', 2));
    await repo.save(withOrdem('sr3', 3));
    await repo.delete('sr2'); // soft-delete da serie do meio

    // count cai para 2, mas maxOrdem continua 3 -> proxima sera 4 (sem colisao)
    expect(await repo.countBySessaoExercicioId('se1')).toBe(2);
    expect(await repo.maxOrdemBySessaoExercicioId('se1')).toBe(3);
  });

  it('maxOrdemBySessaoExercicioId returns 0 when there are no series', async () => {
    expect(await repo.maxOrdemBySessaoExercicioId('se-vazio')).toBe(0);
  });

  it('deleteBySessaoExercicioId and update stamp dirty', async () => {
    await repo.save(make('sr1', 'se1'));
    await repo.update('sr1', { cargaKg: 60, repeticoes: 8 });
    const row = await db.getFirst<{ dirty: number; updated_at: string }>(
      'SELECT dirty, updated_at FROM series_registradas WHERE id = ?', ['sr1']
    );
    expect(row?.dirty).toBe(1);
    expect(row?.updated_at).toMatch(/Z$/);

    await repo.deleteBySessaoExercicioId('se1');
    expect(await repo.listBySessaoExercicioId('se1')).toHaveLength(0);
  });
});
