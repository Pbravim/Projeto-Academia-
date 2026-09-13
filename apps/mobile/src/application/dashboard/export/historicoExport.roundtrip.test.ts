import { describe, expect, it } from 'vitest';

import { SqliteHistoricoExportRepository } from '../../../infrastructure/dashboard/SqliteHistoricoExportRepository';
import { createTestDatabase } from '../../../test/db-setup';

import { buildHistoricoExportTree } from './buildHistoricoExportTree';
import { flattenHistoricoCsvRows } from './historicoCsv';
import { buildHistoricoJson, serializeHistoricoJson } from './historicoJson';

describe('round-trip: SQLite → tree → JSON → parse (critério da issue)', () => {
  it('produces the hand-written expected tree for a mixed fixture', async () => {
    const db = createTestDatabase();

    await db.run(
      `INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, data_hora_fim, status, arquivado)
       VALUES ('s1', 'tr1', 'Treino A', '2026-01-01T10:00:00.000Z', '2026-01-01T11:00:00.000Z', 'finalizada', 0)`
    );

    // Exercício normal, sem substituição, drop set de 3 degraus
    await db.run(
      `INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot, equipamento_snapshot, tracking_type_snapshot, metodo, grupo_id)
       VALUES ('se1', 's1', 'seed-ex-001', 1, 'Supino reto', 'Peito', 'Composto', 'Barra', 'reps_load', 'drop_set', NULL)`
    );
    await db.run(
      `INSERT INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes)
       VALUES ('sr1', 'se1', 'valida', 1, 60, 8)`
    );
    await db.run(
      `INSERT INTO serie_segmentos (id, serie_id, ordem, carga_kg, repeticoes, descanso_segundos, created_at)
       VALUES ('sg1', 'sr1', 2, 50, 6, 0, '2026-01-01T10:05:00.000Z')`
    );
    await db.run(
      `INSERT INTO serie_segmentos (id, serie_id, ordem, carga_kg, repeticoes, descanso_segundos, created_at)
       VALUES ('sg2', 'sr1', 3, 40, 6, 0, '2026-01-01T10:06:00.000Z')`
    );

    // Cardio
    await db.run(
      `INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot, equipamento_snapshot, tracking_type_snapshot, metodo, grupo_id)
       VALUES ('se2', 's1', 'seed-cardio-001', 2, 'Corrida', 'Cardio', 'Cardio', NULL, 'duracao', 'normal', NULL)`
    );
    await db.run(
      `INSERT INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, duracao_segundos, distancia_metros)
       VALUES ('sr2', 'se2', 'valida', 1, 600, 2000)`
    );

    // Substituição
    await db.run(
      `INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot, equipamento_snapshot, tracking_type_snapshot, metodo, grupo_id, substituido_por_exercicio_id, nome_original_snapshot, substituicao_motivo)
       VALUES ('se3', 's1', 'seed-ex-002', 3, 'Leg press', 'Pernas', 'Composto', 'Máquina', 'reps_load', 'normal', NULL, 'seed-ex-003', 'Agachamento livre', 'dor no joelho')`
    );
    await db.run(
      `INSERT INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes)
       VALUES ('sr3', 'se3', 'valida', 1, 120, 10)`
    );

    // Bi-set: dois exercícios com o mesmo grupo_id
    await db.run(
      `INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot, equipamento_snapshot, tracking_type_snapshot, metodo, grupo_id)
       VALUES ('se4', 's1', 'seed-ex-004', 4, 'Crucifixo', 'Peito', 'Isolado', 'Haltere', 'reps_load', 'bi_set', 'grupo-1')`
    );
    await db.run(
      `INSERT INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes)
       VALUES ('sr4', 'se4', 'valida', 1, 20, 12)`
    );
    await db.run(
      `INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot, equipamento_snapshot, tracking_type_snapshot, metodo, grupo_id)
       VALUES ('se5', 's1', 'seed-ex-005', 5, 'Voador', 'Peito', 'Isolado', 'Máquina', 'reps_load', 'bi_set', 'grupo-1')`
    );
    await db.run(
      `INSERT INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes)
       VALUES ('sr5', 'se5', 'valida', 1, 30, 12)`
    );

    const repo = new SqliteHistoricoExportRepository(db);
    const { series, segmentos } = await repo.listRowsParaExportacao();
    const tree = buildHistoricoExportTree(series, segmentos);
    const envelope = buildHistoricoJson(tree, new Date('2026-09-12T18:00:00.000Z'));
    const parsed = JSON.parse(serializeHistoricoJson(envelope));

    expect(parsed.sessoes).toEqual([
      {
        id: 's1', treino_id: 'tr1', treino: 'Treino A',
        data_inicio: '2026-01-01T10:00:00.000Z', data_fim: '2026-01-01T11:00:00.000Z',
        exercicios: [
          {
            id: 'se1', ordem: 1, exercicio_id: 'seed-ex-001', nome: 'Supino reto',
            grupo_muscular: 'Peito', equipamento: 'Barra', tracking_type: 'reps_load',
            metodo: 'drop_set', grupo_id: null, substituicao: null,
            series: [
              {
                id: 'sr1', ordem: 1, carga_kg: 60, repeticoes: 8,
                duracao_s: null, distancia_m: null, intensidade: null, observacao: null,
                segmentos: [
                  { id: 'sg1', ordem: 2, carga_kg: 50, repeticoes: 6, descanso_segundos: 0 },
                  { id: 'sg2', ordem: 3, carga_kg: 40, repeticoes: 6, descanso_segundos: 0 },
                ],
              },
            ],
          },
          {
            id: 'se2', ordem: 2, exercicio_id: 'seed-cardio-001', nome: 'Corrida',
            grupo_muscular: 'Cardio', equipamento: null, tracking_type: 'duracao',
            metodo: 'normal', grupo_id: null, substituicao: null,
            series: [
              {
                id: 'sr2', ordem: 1, carga_kg: null, repeticoes: null,
                duracao_s: 600, distancia_m: 2000, intensidade: null, observacao: null,
                segmentos: [],
              },
            ],
          },
          {
            id: 'se3', ordem: 3, exercicio_id: 'seed-ex-002', nome: 'Leg press',
            grupo_muscular: 'Pernas', equipamento: 'Máquina', tracking_type: 'reps_load',
            metodo: 'normal', grupo_id: null,
            substituicao: { exercicio_id: 'seed-ex-003', nome: 'Agachamento livre', motivo: 'dor no joelho' },
            series: [
              {
                id: 'sr3', ordem: 1, carga_kg: 120, repeticoes: 10,
                duracao_s: null, distancia_m: null, intensidade: null, observacao: null,
                segmentos: [],
              },
            ],
          },
          {
            id: 'se4', ordem: 4, exercicio_id: 'seed-ex-004', nome: 'Crucifixo',
            grupo_muscular: 'Peito', equipamento: 'Haltere', tracking_type: 'reps_load',
            metodo: 'bi_set', grupo_id: 'grupo-1', substituicao: null,
            series: [
              {
                id: 'sr4', ordem: 1, carga_kg: 20, repeticoes: 12,
                duracao_s: null, distancia_m: null, intensidade: null, observacao: null,
                segmentos: [],
              },
            ],
          },
          {
            id: 'se5', ordem: 5, exercicio_id: 'seed-ex-005', nome: 'Voador',
            grupo_muscular: 'Peito', equipamento: 'Máquina', tracking_type: 'reps_load',
            metodo: 'bi_set', grupo_id: 'grupo-1', substituicao: null,
            series: [
              {
                id: 'sr5', ordem: 1, carga_kg: 30, repeticoes: 12,
                duracao_s: null, distancia_m: null, intensidade: null, observacao: null,
                segmentos: [],
              },
            ],
          },
        ],
      },
    ]);

    const csvRows = flattenHistoricoCsvRows(tree);
    // 5 séries, cada uma +1 linha (mãe); a série drop-set soma +2 degraus.
    expect(csvRows).toHaveLength(5 + 2);
  });
});
