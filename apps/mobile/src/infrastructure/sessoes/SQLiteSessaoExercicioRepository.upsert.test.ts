import { beforeEach, describe, expect, it } from 'vitest';

import { SessaoExercicio } from '../../domain/sessoes/entities/SessaoExercicio';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

import { SQLiteSessaoExercicioRepository } from './SQLiteSessaoExercicioRepository';

let db: SQLiteDatabaseClient;
let repo: SQLiteSessaoExercicioRepository;

beforeEach(async () => {
  db = createTestDatabase();
  repo = new SQLiteSessaoExercicioRepository(db);
  await db.run(
    "INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, status) VALUES ('sessao-1', NULL, 'Treino livre', '2026-01-01T00:00:00.000Z', 'em_andamento')"
  );
});

function base(): ReturnType<SessaoExercicio['toPrimitives']> {
  return {
    id: 'se-62', sessaoTreinoId: 'sessao-1', exercicioId: 'ex-1', ordem: 1,
    nomeSnapshot: 'Supino', grupoMuscularSnapshot: 'peito', categoriaSnapshot: 'composto',
    equipamentoSnapshot: 'barra', musculoAlvoSnapshot: ['peito'], movementPatternSnapshot: 'push',
    realizado: false, seriesRecomendadas: 3, execucoesRecomendadas: 10, cargaPadrao: 20,
    tempoDescansoSegundos: 60, metodo: 'normal', grupoId: null, trackingTypeSnapshot: 'reps_load',
    duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null,
    substituidoPorExercicioId: null, substituicaoMotivo: null, nomeOriginalSnapshot: null,
  };
}

interface SavedRow {
  ordem: number; nome_snapshot: string; grupo_muscular_snapshot: string; categoria_snapshot: string;
  equipamento_snapshot: string | null; musculo_alvo_snapshot: string | null; movement_pattern_snapshot: string | null;
  realizado: number; series_recomendadas: number | null; execucoes_recomendadas: number | null;
  carga_padrao: number | null; tempo_descanso_segundos: number | null; metodo: string | null;
  grupo_id: string | null; tracking_type_snapshot: string | null;
  duracao_recomendada_segundos: number | null; distancia_recomendada_metros: number | null;
  intensidade_recomendada: number | null; substituido_por_exercicio_id: string | null;
  substituicao_motivo: string | null; nome_original_snapshot: string | null;
  server_rev: number; dirty: number; deleted_at: string | null; updated_at: string;
}

const SELECT_ROW = 'SELECT * FROM sessao_exercicios WHERE id = ?';

describe('SQLiteSessaoExercicioRepository — save preserva server_rev no re-save (#62)', () => {
  it('re-save aplica TODAS as colunas do domínio e preserva server_rev setado por fora (ex.: sync)', async () => {
    await repo.save(SessaoExercicio.create(base()));

    await db.run(
      "UPDATE sessao_exercicios SET server_rev = 5, dirty = 0, updated_at = '2000-01-01T00:00:00.000Z' WHERE id = ?",
      ['se-62']
    );

    const atualizado = SessaoExercicio.restore({
      ...base(),
      ordem: 2, nomeSnapshot: 'Supino inclinado', grupoMuscularSnapshot: 'peito superior',
      categoriaSnapshot: 'isolado', equipamentoSnapshot: 'halteres', musculoAlvoSnapshot: ['ombro'],
      movementPatternSnapshot: 'pull', realizado: true, seriesRecomendadas: 4, execucoesRecomendadas: 12,
      cargaPadrao: 30, tempoDescansoSegundos: 90, metodo: 'drop_set', grupoId: 'g-1',
      trackingTypeSnapshot: 'cardio', duracaoRecomendadaSegundos: 40, distanciaRecomendadaMetros: 100,
      intensidadeRecomendada: 7, substituidoPorExercicioId: 'ex-2', substituicaoMotivo: 'variacao',
      nomeOriginalSnapshot: 'Supino',
    });
    await repo.save(atualizado);

    const row = await db.getFirst<SavedRow>(SELECT_ROW, ['se-62']);

    expect(row?.ordem).toBe(2);
    expect(row?.nome_snapshot).toBe('Supino inclinado');
    expect(row?.grupo_muscular_snapshot).toBe('peito superior');
    expect(row?.categoria_snapshot).toBe('isolado');
    expect(row?.equipamento_snapshot).toBe('halteres');
    expect(row?.musculo_alvo_snapshot).toBe(JSON.stringify(['ombro']));
    expect(row?.movement_pattern_snapshot).toBe('pull');
    expect(row?.realizado).toBe(1);
    expect(row?.series_recomendadas).toBe(4);
    expect(row?.execucoes_recomendadas).toBe(12);
    expect(row?.carga_padrao).toBe(30);
    expect(row?.tempo_descanso_segundos).toBe(90);
    expect(row?.metodo).toBe('drop_set');
    expect(row?.grupo_id).toBe('g-1');
    expect(row?.tracking_type_snapshot).toBe('cardio');
    expect(row?.duracao_recomendada_segundos).toBe(40);
    expect(row?.distancia_recomendada_metros).toBe(100);
    expect(row?.intensidade_recomendada).toBe(7);
    expect(row?.substituido_por_exercicio_id).toBe('ex-2');
    expect(row?.substituicao_motivo).toBe('variacao');
    expect(row?.nome_original_snapshot).toBe('Supino');
    expect(row?.server_rev).toBe(5);
    expect(row?.dirty).toBe(1);
    expect(row?.deleted_at).toBeNull();
    expect(row?.updated_at).not.toBe('2000-01-01T00:00:00.000Z');
  });
});
