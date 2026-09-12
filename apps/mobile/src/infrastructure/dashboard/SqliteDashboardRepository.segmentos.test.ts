import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

import { SqliteDashboardRepository } from './SqliteDashboardRepository';

/**
 * Volume da sessao passa a somar a serie-mae + os degraus (drop set/rest-pause/
 * piramide); e1RM/PR (`melhor_orm`, recordes pessoais) continuam olhando so a mae.
 */

const T = '2026-07-01T10:00:00.000Z';
const T_FIM = '2026-07-01T11:00:00.000Z';

let db: SQLiteDatabaseClient;
let repo: SqliteDashboardRepository;

beforeEach(async () => {
  db = createTestDatabase();
  repo = new SqliteDashboardRepository(db);
  await db.run(
    `INSERT INTO treinos (id, name, created_at, updated_at) VALUES ('tr-1', 'Treino A', ?, ?)`,
    [T, T],
  );
  await db.run(
    `INSERT INTO exercises (id, name, normalized_name, group_muscle, category, load_unit, is_custom, created_at, updated_at, dirty)
     VALUES ('ex-1', 'Supino', 'supino', 'Peito', 'Composto', 'kg', 1, ?, ?, 0)`,
    [T, T],
  );
  await db.run(
    `INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, data_hora_fim, status, updated_at, dirty)
     VALUES ('st-1', 'tr-1', 'Treino A', ?, ?, 'finalizada', ?, 0)`,
    [T, T_FIM, T],
  );
  await db.run(
    `INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot, updated_at, dirty)
     VALUES ('se-1', 'st-1', 'ex-1', 1, 'Supino', 'Peito', 'Composto', ?, 0)`,
    [T],
  );
  // Serie-mae 80kg×8 = 640 (Epley ~101.3)
  await db.run(
    `INSERT INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes, updated_at, dirty)
     VALUES ('sr-1', 'se-1', 'valida', 1, 80, 8, ?, 0)`,
    [T],
  );
  // Degraus (drop set) 60kg×6 + 100kg×3 -- somam volume mas nao entram no 1RM.
  // sg-2 e DE PROPOSITO mais pesado que a mae (Epley 110 > 101.3 da mae): um MAX(e1RM)
  // que incluisse os degraus por engano mudaria o resultado (achado #2, revisao 1).
  await db.run(
    `INSERT INTO serie_segmentos (id, serie_id, ordem, carga_kg, repeticoes, created_at, dirty)
     VALUES ('sg-1', 'sr-1', 2, 60, 6, ?, 0)`,
    [T],
  );
  await db.run(
    `INSERT INTO serie_segmentos (id, serie_id, ordem, carga_kg, repeticoes, created_at, dirty)
     VALUES ('sg-2', 'sr-1', 3, 100, 3, ?, 0)`,
    [T],
  );
});

describe('dashboard — volume da sessao inclui degraus; e1RM ignora', () => {
  it('volumeTotal da sessao soma mae (640) + degraus (360 + 300) = 1300', async () => {
    const stats = await repo.getStats();
    const sessao = stats.evolucaoPorTreino[0]!.sessoes[0]!;

    expect(sessao.volumeTotal).toBe(1300);
  });

  it('melhorOrm/recorde pessoal olham so a serie-mae, mesmo com degrau MAIS PESADO (Epley 110 > 101.3)', async () => {
    const stats = await repo.getStats();
    const sessao = stats.evolucaoPorTreino[0]!.sessoes[0]!;

    expect(sessao.melhorOrm).toBe(101.3); // Epley de 80x8 -- NAO 110 (o do degrau sg-2)
    expect(stats.recordesPessoais[0]?.melhorOrmKg).toBe(101.3);
  });

  it('degraus soft-deletados nao entram no volume', async () => {
    await db.run(`UPDATE serie_segmentos SET deleted_at = ? WHERE id = 'sg-2'`, [T]);

    const stats = await repo.getStats();
    const sessao = stats.evolucaoPorTreino[0]!.sessoes[0]!;

    expect(sessao.volumeTotal).toBe(1000); // 640 + 360 (sg-1), sem os 300 de sg-2
  });
});
