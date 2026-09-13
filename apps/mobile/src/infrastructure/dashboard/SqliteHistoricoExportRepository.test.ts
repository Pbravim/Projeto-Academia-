import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

import { SqliteHistoricoExportRepository } from './SqliteHistoricoExportRepository';

let db: SQLiteDatabaseClient;
let repo: SqliteHistoricoExportRepository;

beforeEach(async () => {
  db = createTestDatabase();
  repo = new SqliteHistoricoExportRepository(db);
});

async function seedSessao(
  target: SQLiteDatabaseClient,
  overrides: Partial<{
    id: string;
    treinoId: string;
    treinoNome: string;
    dataInicio: string;
    dataFim: string | null;
    status: string;
    arquivado: number;
    deletedAt: string | null;
  }> = {}
): Promise<string> {
  const id = overrides.id ?? 's1';
  await target.run(
    `INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, data_hora_fim, status, arquivado, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      overrides.treinoId ?? 'tr1',
      overrides.treinoNome ?? 'Treino A',
      overrides.dataInicio ?? '2026-01-01T10:00:00.000Z',
      overrides.dataFim ?? '2026-01-01T11:00:00.000Z',
      overrides.status ?? 'finalizada',
      overrides.arquivado ?? 0,
      overrides.deletedAt ?? null,
    ]
  );
  return id;
}

async function seedExercicio(
  target: SQLiteDatabaseClient,
  overrides: Partial<{
    id: string;
    sessaoTreinoId: string;
    exercicioId: string;
    ordem: number;
    nomeSnapshot: string;
    grupoMuscularSnapshot: string;
    equipamentoSnapshot: string | null;
    trackingTypeSnapshot: string | null;
    metodo: string;
    grupoId: string | null;
    substituidoPorExercicioId: string | null;
    nomeOriginalSnapshot: string | null;
    substituicaoMotivo: string | null;
    deletedAt: string | null;
  }> = {}
): Promise<string> {
  const id = overrides.id ?? 'se1';
  await target.run(
    `INSERT INTO sessao_exercicios (
       id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot,
       categoria_snapshot, equipamento_snapshot, tracking_type_snapshot, metodo, grupo_id,
       substituido_por_exercicio_id, nome_original_snapshot, substituicao_motivo, deleted_at
     ) VALUES (?, ?, ?, ?, ?, ?, 'Composto', ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      overrides.sessaoTreinoId ?? 's1',
      overrides.exercicioId ?? 'seed-ex-001',
      overrides.ordem ?? 1,
      overrides.nomeSnapshot ?? 'Supino reto',
      overrides.grupoMuscularSnapshot ?? 'Peito',
      overrides.equipamentoSnapshot ?? 'Barra',
      overrides.trackingTypeSnapshot ?? 'reps_load',
      overrides.metodo ?? 'normal',
      overrides.grupoId ?? null,
      overrides.substituidoPorExercicioId ?? null,
      overrides.nomeOriginalSnapshot ?? null,
      overrides.substituicaoMotivo ?? null,
      overrides.deletedAt ?? null,
    ]
  );
  return id;
}

async function seedSerie(
  target: SQLiteDatabaseClient,
  overrides: Partial<{
    id: string;
    sessaoExercicioId: string;
    tipoSerie: string;
    ordem: number;
    cargaKg: number | null;
    repeticoes: number | null;
    duracaoSegundos: number | null;
    distanciaMetros: number | null;
    intensidade: number | null;
    observacao: string | null;
    deletedAt: string | null;
  }> = {}
): Promise<string> {
  const id = overrides.id ?? 'sr1';
  await target.run(
    `INSERT INTO series_registradas (
       id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes,
       duracao_segundos, distancia_metros, intensidade, observacao, deleted_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      overrides.sessaoExercicioId ?? 'se1',
      overrides.tipoSerie ?? 'valida',
      overrides.ordem ?? 1,
      overrides.cargaKg ?? null,
      overrides.repeticoes ?? null,
      overrides.duracaoSegundos ?? null,
      overrides.distanciaMetros ?? null,
      overrides.intensidade ?? null,
      overrides.observacao ?? null,
      overrides.deletedAt ?? null,
    ]
  );
  return id;
}

async function seedSegmento(
  target: SQLiteDatabaseClient,
  overrides: Partial<{
    id: string;
    serieId: string;
    ordem: number;
    cargaKg: number | null;
    repeticoes: number | null;
    descansoSegundos: number | null;
    deletedAt: string | null;
  }> = {}
): Promise<string> {
  const id = overrides.id ?? 'sg1';
  await target.run(
    `INSERT INTO serie_segmentos (id, serie_id, ordem, carga_kg, repeticoes, descanso_segundos, created_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, '2026-01-01T10:00:00.000Z', ?)`,
    [
      id,
      overrides.serieId ?? 'sr1',
      overrides.ordem ?? 2,
      overrides.cargaKg ?? null,
      overrides.repeticoes ?? null,
      overrides.descansoSegundos ?? null,
      overrides.deletedAt ?? null,
    ]
  );
  return id;
}

describe('SqliteHistoricoExportRepository', () => {
  it('lists a série and its degraus for a finalized, non-archived session', async () => {
    await seedSessao(db);
    await seedExercicio(db);
    await seedSerie(db, { cargaKg: 60, repeticoes: 8 });
    await seedSegmento(db, { id: 'sg1', ordem: 2, cargaKg: 50, repeticoes: 6, descansoSegundos: 0 });
    await seedSegmento(db, { id: 'sg2', ordem: 3, cargaKg: 40, repeticoes: 6, descansoSegundos: 0 });

    const { series, segmentos } = await repo.listRowsParaExportacao();

    expect(series).toHaveLength(1);
    expect(series[0].serie_id).toBe('sr1');
    expect(series[0].carga_kg).toBe(60);
    expect(segmentos).toHaveLength(2);
    expect(segmentos.map((s) => s.ordem)).toEqual([2, 3]);
  });

  it('excludes sessões em_andamento, arquivadas e soft-deletadas em qualquer nível', async () => {
    await seedSessao(db, { id: 's-andamento', status: 'em_andamento' });
    await seedExercicio(db, { id: 'se-andamento', sessaoTreinoId: 's-andamento' });
    await seedSerie(db, { id: 'sr-andamento', sessaoExercicioId: 'se-andamento' });

    await seedSessao(db, { id: 's-arquivada', arquivado: 1 });
    await seedExercicio(db, { id: 'se-arquivada', sessaoTreinoId: 's-arquivada' });
    await seedSerie(db, { id: 'sr-arquivada', sessaoExercicioId: 'se-arquivada' });

    await seedSessao(db, { id: 's-deletada', deletedAt: '2026-01-02T00:00:00.000Z' });
    await seedExercicio(db, { id: 'se-deletada', sessaoTreinoId: 's-deletada' });
    await seedSerie(db, { id: 'sr-deletada', sessaoExercicioId: 'se-deletada' });

    await seedSessao(db, { id: 's-ex-deletado' });
    await seedExercicio(db, { id: 'se-ex-deletado', sessaoTreinoId: 's-ex-deletado', deletedAt: '2026-01-02T00:00:00.000Z' });
    await seedSerie(db, { id: 'sr-ex-deletado', sessaoExercicioId: 'se-ex-deletado' });

    await seedSessao(db, { id: 's-sr-deletada' });
    await seedExercicio(db, { id: 'se-sr-deletada', sessaoTreinoId: 's-sr-deletada' });
    await seedSerie(db, { id: 'sr-sr-deletada', sessaoExercicioId: 'se-sr-deletada', deletedAt: '2026-01-02T00:00:00.000Z' });

    await seedSessao(db, { id: 's-aquecimento' });
    await seedExercicio(db, { id: 'se-aquecimento', sessaoTreinoId: 's-aquecimento' });
    await seedSerie(db, { id: 'sr-aquecimento', sessaoExercicioId: 'se-aquecimento', tipoSerie: 'aquecimento' });

    const { series } = await repo.listRowsParaExportacao();

    expect(series).toHaveLength(0);
  });

  it('excludes segmentos tombstonados (segmento com deleted_at)', async () => {
    await seedSessao(db);
    await seedExercicio(db);
    await seedSerie(db);
    await seedSegmento(db, { id: 'sg1', ordem: 2 });
    await seedSegmento(db, { id: 'sg2', ordem: 3, deletedAt: '2026-01-02T00:00:00.000Z' });

    const { segmentos } = await repo.listRowsParaExportacao();

    expect(segmentos.map((s) => s.id)).toEqual(['sg1']);
  });

  it('returns cardio série with duracao_segundos and null carga/repeticoes', async () => {
    await seedSessao(db);
    await seedExercicio(db, { trackingTypeSnapshot: 'duracao' });
    await seedSerie(db, { cargaKg: null, repeticoes: null, duracaoSegundos: 600 });

    const { series } = await repo.listRowsParaExportacao();

    expect(series[0].duracao_segundos).toBe(600);
    expect(series[0].carga_kg).toBeNull();
    expect(series[0].repeticoes).toBeNull();
  });

  it('orders rows ASC by data_hora_inicio, exercicio ordem, série ordem', async () => {
    await seedSessao(db, { id: 's-later', dataInicio: '2026-02-01T10:00:00.000Z' });
    await seedExercicio(db, { id: 'se-later', sessaoTreinoId: 's-later', ordem: 1 });
    await seedSerie(db, { id: 'sr-later', sessaoExercicioId: 'se-later', ordem: 1 });

    await seedSessao(db, { id: 's-earlier', dataInicio: '2026-01-01T10:00:00.000Z' });
    await seedExercicio(db, { id: 'se-earlier', sessaoTreinoId: 's-earlier', ordem: 1 });
    await seedSerie(db, { id: 'sr-earlier', sessaoExercicioId: 'se-earlier', ordem: 1 });

    const { series } = await repo.listRowsParaExportacao();

    expect(series.map((s) => s.sessao_id)).toEqual(['s-earlier', 's-later']);
  });

  it('orders by exercicio_ordem e serie_ordem mesmo quando inseridos fora de ordem (prende o ORDER BY, não só o rowid)', async () => {
    await seedSessao(db);
    // Exercícios inseridos com ordem 2 antes de ordem 1: se o ORDER BY não
    // ordenar por se.ordem, o rowid de inserção venceria e a asserção falharia.
    await seedExercicio(db, { id: 'se2', ordem: 2 });
    await seedExercicio(db, { id: 'se1', ordem: 1 });
    // Séries inseridas com ordem 2 antes de ordem 1, em cada exercício.
    await seedSerie(db, { id: 'sr1-2', sessaoExercicioId: 'se1', ordem: 2 });
    await seedSerie(db, { id: 'sr1-1', sessaoExercicioId: 'se1', ordem: 1 });
    await seedSerie(db, { id: 'sr2-2', sessaoExercicioId: 'se2', ordem: 2 });
    await seedSerie(db, { id: 'sr2-1', sessaoExercicioId: 'se2', ordem: 1 });

    const { series } = await repo.listRowsParaExportacao();

    expect(series.map((s) => [s.exercicio_ordem, s.serie_ordem])).toEqual([
      [1, 1], [1, 2], [2, 1], [2, 2],
    ]);
  });

  it('ordena segmentos por ordem mesmo quando inseridos fora de ordem', async () => {
    await seedSessao(db);
    await seedExercicio(db);
    await seedSerie(db);
    // Degrau de ordem 3 inserido antes do de ordem 2: se o ORDER BY não
    // ordenar por sg.ordem, o rowid de inserção venceria.
    await seedSegmento(db, { id: 'sg-3', ordem: 3 });
    await seedSegmento(db, { id: 'sg-2', ordem: 2 });

    const { segmentos } = await repo.listRowsParaExportacao();

    expect(segmentos.map((s) => s.ordem)).toEqual([2, 3]);
  });

  it('desempata por st.id quando duas sessões têm o mesmo data_hora_inicio', async () => {
    const mesmaData = '2026-01-01T10:00:00.000Z';
    await seedSessao(db, { id: 's-b', dataInicio: mesmaData });
    await seedExercicio(db, { id: 'se-b', sessaoTreinoId: 's-b' });
    await seedSerie(db, { id: 'sr-b', sessaoExercicioId: 'se-b' });

    await seedSessao(db, { id: 's-a', dataInicio: mesmaData });
    await seedExercicio(db, { id: 'se-a', sessaoTreinoId: 's-a' });
    await seedSerie(db, { id: 'sr-a', sessaoExercicioId: 'se-a' });

    const { series } = await repo.listRowsParaExportacao();

    expect(series.map((s) => s.sessao_id)).toEqual(['s-a', 's-b']);
  });
});
