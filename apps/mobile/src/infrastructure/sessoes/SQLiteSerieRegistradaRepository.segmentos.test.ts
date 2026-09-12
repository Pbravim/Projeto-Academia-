import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

import { SQLiteSerieRegistradaRepository } from './SQLiteSerieRegistradaRepository';

const T = '2026-07-01T10:00:00.000Z';

let db: SQLiteDatabaseClient;
let repo: SQLiteSerieRegistradaRepository;

interface SegmentoRow {
  deleted_at: string | null;
  dirty: number;
}

const getSegmento = (id: string) =>
  db.getFirst<SegmentoRow>('SELECT deleted_at, dirty FROM serie_segmentos WHERE id = ?', [id]);

async function seedTreino(id: string): Promise<void> {
  await db.run(
    `INSERT INTO treinos (id, name, created_at, updated_at) VALUES (?, 'Treino A', ?, ?)`,
    [id, T, T]
  );
}

async function seedSessao(sessaoId: string, treinoId: string): Promise<void> {
  await db.run(
    `INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, status)
     VALUES (?, ?, 'Treino A', ?, 'em_andamento')`,
    [sessaoId, treinoId, T]
  );
}

async function seedSessaoExercicio(id: string, sessaoId: string, exercicioId = 'ex1'): Promise<void> {
  await db.run(
    `INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot)
     VALUES (?, ?, ?, 0, 'X', 'Peito', 'Composto')`,
    [id, sessaoId, exercicioId]
  );
}

async function seedSerieComSegmento(serieId: string, sessaoExercicioId: string, segmentoId: string): Promise<void> {
  await db.run(
    `INSERT INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes)
     VALUES (?, ?, 'valida', 1, 60, 8)`,
    [serieId, sessaoExercicioId]
  );
  await db.run(
    `INSERT INTO serie_segmentos (id, serie_id, ordem, carga_kg, repeticoes, created_at, dirty)
     VALUES (?, ?, 2, 40, 6, ?, 0)`,
    [segmentoId, serieId, T]
  );
}

beforeEach(async () => {
  db = createTestDatabase();
  repo = new SQLiteSerieRegistradaRepository(db);
});

describe('SQLiteSerieRegistradaRepository — cascata de tombstone dos segmentos', () => {
  it('delete(id) tombstona os segmentos da serie deletada', async () => {
    await seedTreino('tr1');
    await seedSessao('s1', 'tr1');
    await seedSessaoExercicio('se1', 's1');
    await seedSerieComSegmento('sr1', 'se1', 'seg1');

    await repo.delete('sr1');

    const row = await getSegmento('seg1');
    expect(row?.deleted_at).not.toBeNull();
    expect(row?.dirty).toBe(1);
  });

  it('deleteBySessaoExercicioId tombstona os segmentos de todas as series do exercicio', async () => {
    await seedTreino('tr1');
    await seedSessao('s1', 'tr1');
    await seedSessaoExercicio('se1', 's1');
    await seedSerieComSegmento('sr1', 'se1', 'seg1');

    await repo.deleteBySessaoExercicioId('se1');

    expect((await getSegmento('seg1'))?.deleted_at).not.toBeNull();
  });

  it('deleteBySessaoExercicioIds tombstona os segmentos de series em varios exercicios', async () => {
    await seedTreino('tr1');
    await seedSessao('s1', 'tr1');
    await seedSessaoExercicio('se1', 's1');
    await seedSessaoExercicio('se2', 's1');
    await seedSerieComSegmento('sr1', 'se1', 'seg1');
    await seedSerieComSegmento('sr2', 'se2', 'seg2');

    await repo.deleteBySessaoExercicioIds(['se1', 'se2']);

    expect((await getSegmento('seg1'))?.deleted_at).not.toBeNull();
    expect((await getSegmento('seg2'))?.deleted_at).not.toBeNull();
  });

  it('deleteByExercicioId tombstona os segmentos de series do exercicio do catalogo', async () => {
    await seedTreino('tr1');
    await seedSessao('s1', 'tr1');
    await seedSessaoExercicio('se1', 's1', 'exX');
    await seedSerieComSegmento('sr1', 'se1', 'seg1');

    await repo.deleteByExercicioId('exX');

    expect((await getSegmento('seg1'))?.deleted_at).not.toBeNull();
  });

  it('deleteByTreinoId tombstona os segmentos de todas as sessoes do treino', async () => {
    await seedTreino('tr1');
    await seedSessao('s1', 'tr1');
    await seedSessaoExercicio('se1', 's1');
    await seedSerieComSegmento('sr1', 'se1', 'seg1');

    await repo.deleteByTreinoId('tr1');

    expect((await getSegmento('seg1'))?.deleted_at).not.toBeNull();
  });

  it('nao re-tombstona um segmento ja apagado (dirty continua consistente, sem erro)', async () => {
    await seedTreino('tr1');
    await seedSessao('s1', 'tr1');
    await seedSessaoExercicio('se1', 's1');
    await seedSerieComSegmento('sr1', 'se1', 'seg1');

    await repo.delete('sr1');
    await expect(repo.deleteBySessaoExercicioId('se1')).resolves.not.toThrow();
  });
});
