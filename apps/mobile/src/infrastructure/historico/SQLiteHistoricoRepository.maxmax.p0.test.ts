import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

import { SQLiteHistoricoRepository } from './SQLiteHistoricoRepository';

/**
 * Regressão P0.5 (auditoria rodada 3, 2026-07-06): getUltimasExecucoesValidas
 * cruzava MAX(data_hora_fim) e MAX(id) calculados de forma INDEPENDENTE no
 * GROUP BY. Quando a sessão mais recente não tinha o maior id lexicográfico,
 * o JOIN não casava e o exercício sumia silenciosamente das sugestões de carga.
 *
 * Também cobre o P1: as consultas de "última execução válida" não filtravam
 * tipo_serie='valida' (a referência InMemory filtra) — série de aquecimento
 * podia virar a sugestão de carga.
 */

let db: SQLiteDatabaseClient;
let repo: SQLiteHistoricoRepository;

async function seedSessao(opts: {
  sessaoId: string; fim: string; seId: string; exercicioId?: string;
  series: { id: string; carga: number; reps: number; tipo?: string }[];
}) {
  await db.run(
    `INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, data_hora_fim, status, updated_at, dirty)
     VALUES (?, 'tr-1', 'Treino A', ?, ?, 'finalizada', ?, 0)`,
    [opts.sessaoId, opts.fim, opts.fim, opts.fim]
  );
  await db.run(
    `INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot, realizado, metodo, updated_at, dirty)
     VALUES (?, ?, ?, 0, 'Supino', 'Peito', 'Composto', 1, 'normal', ?, 0)`,
    [opts.seId, opts.sessaoId, opts.exercicioId ?? 'ex-1', opts.fim]
  );
  for (const s of opts.series) {
    await db.run(
      `INSERT INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes, updated_at, dirty)
       VALUES (?, ?, ?, 0, ?, ?, ?, 0)`,
      [s.id, opts.seId, s.tipo ?? 'valida', s.carga, s.reps, opts.fim]
    );
  }
}

beforeEach(() => {
  db = createTestDatabase();
  repo = new SQLiteHistoricoRepository(db);
});

describe('getUltimasExecucoesValidas — sessão mais recente de verdade', () => {
  it('não some quando a sessão mais recente tem id lexicograficamente MENOR', async () => {
    // Sessão antiga com id "grande", sessão nova com id "pequeno".
    await seedSessao({
      sessaoId: 'st-zzz', fim: '2026-07-01T10:00:00.000Z', seId: 'se-old',
      series: [{ id: 'sr-old', carga: 50, reps: 10 }],
    });
    await seedSessao({
      sessaoId: 'st-aaa', fim: '2026-07-05T10:00:00.000Z', seId: 'se-new',
      series: [{ id: 'sr-new', carga: 60, reps: 8 }],
    });

    const map = await repo.getUltimasExecucoesValidas();

    expect(map.get('ex-1')).toMatchObject({
      cargaKg: 60,
      dataExecucao: '2026-07-05T10:00:00.000Z',
    });
  });

  it('empate de data_hora_fim: vence a sessão de maior id (tiebreak estável)', async () => {
    const fim = '2026-07-05T10:00:00.000Z';
    await seedSessao({
      sessaoId: 'st-a', fim, seId: 'se-a',
      series: [{ id: 'sr-a', carga: 40, reps: 10 }],
    });
    await seedSessao({
      sessaoId: 'st-b', fim, seId: 'se-b',
      series: [{ id: 'sr-b', carga: 55, reps: 10 }],
    });

    const map = await repo.getUltimasExecucoesValidas();
    expect(map.get('ex-1')?.cargaKg).toBe(55);
  });

  it('ignora séries de aquecimento na sugestão de carga', async () => {
    await seedSessao({
      sessaoId: 'st-1', fim: '2026-07-05T10:00:00.000Z', seId: 'se-1',
      series: [
        { id: 'sr-aq', carga: 100, reps: 15, tipo: 'aquecimento' },
        { id: 'sr-va', carga: 60, reps: 8 },
      ],
    });

    const map = await repo.getUltimasExecucoesValidas();
    expect(map.get('ex-1')?.cargaKg).toBe(60);
  });
});

describe('getUltimaExecucaoValida — filtro de tipo_serie', () => {
  it('ignora séries de aquecimento', async () => {
    await seedSessao({
      sessaoId: 'st-1', fim: '2026-07-05T10:00:00.000Z', seId: 'se-1',
      series: [
        { id: 'sr-aq', carga: 100, reps: 15, tipo: 'aquecimento' },
        { id: 'sr-va', carga: 60, reps: 8 },
      ],
    });

    const ultima = await repo.getUltimaExecucaoValida('ex-1');
    expect(ultima?.cargaKg).toBe(60);
  });
});
