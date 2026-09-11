import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

import { SqliteDashboardRepository } from './SqliteDashboardRepository';

/**
 * Regressão P1-A (auditoria rodada 3, 2026-07-06):
 * - aderência bucketava por dia UTC com rótulos locais — treino às 21h30 BRT
 *   caía no dia seguinte e o "hoje" era marcado errado a partir das 21h;
 * - recordes pessoais não filtravam status='finalizada' — série de sessão
 *   cancelada virava PR eterno.
 *
 * Nota: o cenário de fuso só diverge em máquinas fora de UTC (o dev roda em
 * UTC-3); em UTC o teste continua válido como guarda básica da aderência.
 */

let db: SQLiteDatabaseClient;
let repo: SqliteDashboardRepository;

async function seedSessaoComSerie(opts: {
  sessaoId: string; inicioIso: string; status: string; carga: number; reps: number;
}) {
  await db.run(
    `INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, data_hora_fim, status, updated_at, dirty)
     VALUES (?, 'tr-1', 'Treino A', ?, ?, ?, ?, 0)`,
    [opts.sessaoId, opts.inicioIso, opts.inicioIso, opts.status, opts.inicioIso]
  );
  await db.run(
    `INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot, realizado, metodo, updated_at, dirty)
     VALUES (?, ?, 'seed-ex-001', 0, 'Supino', 'Peito', 'Composto', 1, 'normal', ?, 0)`,
    [`se-${opts.sessaoId}`, opts.sessaoId, opts.inicioIso]
  );
  await db.run(
    `INSERT INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes, updated_at, dirty)
     VALUES (?, ?, 'valida', 0, ?, ?, ?, 0)`,
    [`sr-${opts.sessaoId}`, `se-${opts.sessaoId}`, opts.carga, opts.reps, opts.inicioIso]
  );
}

beforeEach(() => {
  db = createTestDatabase();
  repo = new SqliteDashboardRepository(db);
});

describe('aderência — dia calendário LOCAL', () => {
  it('treino às 21h30 locais de hoje conta no dia de HOJE da aderência semanal', async () => {
    const hoje2130Local = new Date();
    hoje2130Local.setHours(21, 30, 0, 0);
    await seedSessaoComSerie({
      sessaoId: 'st-1',
      inicioIso: hoje2130Local.toISOString(),
      status: 'finalizada',
      carga: 60,
      reps: 10,
    });

    const stats = await repo.getStats();

    // Índice local do dia (aderenciaSemanal começa na segunda).
    const dow = new Date().getDay();
    const idxHoje = dow === 0 ? 6 : dow - 1;
    expect(stats.aderenciaSemanal[idxHoje]).toMatchObject({
      totalSessoes: 1,
      isToday: true,
    });
    // E em nenhum outro dia da semana.
    const total = stats.aderenciaSemanal.reduce((n, d) => n + d.totalSessoes, 0);
    expect(total).toBe(1);
  });
});

describe('recordes pessoais — só sessões finalizadas', () => {
  it('série de sessão cancelada não vira PR', async () => {
    await seedSessaoComSerie({
      sessaoId: 'st-ok', inicioIso: '2026-07-01T10:00:00.000Z',
      status: 'finalizada', carga: 60, reps: 10,
    });
    await seedSessaoComSerie({
      sessaoId: 'st-cancel', inicioIso: '2026-07-02T10:00:00.000Z',
      status: 'cancelada', carga: 200, reps: 10,
    });

    const stats = await repo.getStats();

    const pr = stats.recordesPessoais.find((r) => r.exercicioNome.includes('Supino'));
    expect(pr).toBeDefined();
    // 200kg da cancelada não pode aparecer; 1RM de 60kg×10 (Epley) = 80kg.
    expect(pr!.melhorOrmKg).toBeLessThan(100);
  });
});
