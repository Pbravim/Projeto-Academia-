import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteSessaoTreinoRepository } from './SQLiteSessaoTreinoRepository';
import { SQLiteSessaoExercicioRepository } from './SQLiteSessaoExercicioRepository';
import { SQLiteRegistroPesoRepository } from '../peso/SQLiteRegistroPesoRepository';
import { SessaoTreino } from '../../domain/sessoes/entities/SessaoTreino';
import { SessaoExercicio } from '../../domain/sessoes/entities/SessaoExercicio';
import { RegistroPeso } from '../../domain/peso/entities/RegistroPeso';

/**
 * Regressão P0 (auditoria rodada 3, 2026-07-06): getDirty/applyServerRows de
 * sessao_treinos, sessao_exercicios e registros_peso referenciavam a coluna
 * created_at, que NENHUMA migração criou nessas tabelas → todo SyncEngine.run()
 * lançava "no such column: created_at". Passava despercebido porque o db de
 * teste antigo usava um schema divergente das migrações reais.
 *
 * O contrato de sync ainda transporta createdAt; ele é derivado de uma coluna
 * real (data_hora_inicio / updated_at / data_registro), como já fazia o repo
 * de séries.
 */

let db: SQLiteDatabaseClient;

beforeEach(() => {
  db = createTestDatabase();
});

function novaSessao(id: string) {
  return SessaoTreino.restore({
    id,
    treinoId: 'treino-1',
    treinoNomeSnapshot: 'Treino A',
    dataHoraInicio: '2026-07-01T10:00:00.000Z',
    dataHoraFim: '2026-07-01T11:00:00.000Z',
    status: 'finalizada',
  });
}

describe('SQLiteSessaoTreinoRepository — sync round-trip', () => {
  it('getDirty não referencia coluna inexistente e deriva createdAt', async () => {
    const repo = new SQLiteSessaoTreinoRepository(db);
    await repo.save(novaSessao('st-1'));

    const dirty = await repo.getDirty();

    expect(dirty).toHaveLength(1);
    expect(dirty[0]).toMatchObject({
      id: 'st-1',
      treinoId: 'treino-1',
      dataHoraInicio: '2026-07-01T10:00:00.000Z',
      status: 'finalizada',
      arquivado: false,
    });
    expect(dirty[0].createdAt).toBeTruthy();
  });

  it('applyServerRows grava em db novo com dirty=0', async () => {
    const repo = new SQLiteSessaoTreinoRepository(db);
    await repo.save(novaSessao('st-2'));
    const dirty = await repo.getDirty();

    const db2 = createTestDatabase();
    const repo2 = new SQLiteSessaoTreinoRepository(db2);
    await repo2.applyServerRows(dirty);

    const applied = await repo2.findById('st-2');
    expect(applied?.toPrimitives()).toMatchObject({
      treinoNomeSnapshot: 'Treino A',
      status: 'finalizada',
    });
    const row = await db2.getFirst<{ dirty: number }>(
      'SELECT dirty FROM sessao_treinos WHERE id = ?', ['st-2']
    );
    expect(row?.dirty).toBe(0);
  });
});

describe('SQLiteSessaoExercicioRepository — sync round-trip', () => {
  it('save → getDirty → applyServerRows preserva a linha', async () => {
    const sessaoRepo = new SQLiteSessaoTreinoRepository(db);
    await sessaoRepo.save(novaSessao('st-3'));

    const repo = new SQLiteSessaoExercicioRepository(db);
    await repo.save(SessaoExercicio.restore({
      id: 'se-1',
      sessaoTreinoId: 'st-3',
      exercicioId: 'seed-ex-001',
      ordem: 0,
      nomeSnapshot: 'Supino Reto com Barra',
      grupoMuscularSnapshot: 'Peito',
      categoriaSnapshot: 'Composto',
      equipamentoSnapshot: null,
      musculoAlvoSnapshot: ['Peitoral maior'],
      movementPatternSnapshot: null,
      realizado: true,
      seriesRecomendadas: 3,
      execucoesRecomendadas: 10,
      cargaPadrao: 60,
      tempoDescansoSegundos: 90,
      metodo: 'normal',
      grupoId: null,
      trackingTypeSnapshot: 'reps_load',
      duracaoRecomendadaSegundos: null,
      distanciaRecomendadaMetros: null,
      intensidadeRecomendada: null,
      substituidoPorExercicioId: null,
      substituicaoMotivo: null,
      nomeOriginalSnapshot: null,
    }));

    const dirty = await repo.getDirty();
    expect(dirty).toHaveLength(1);
    expect(dirty[0]).toMatchObject({ id: 'se-1', sessaoTreinoId: 'st-3', cargaPadrao: 60 });
    expect(dirty[0].createdAt).toBeTruthy();

    // Device novo: aplica o pai primeiro (FK ON), depois o filho.
    const db2 = createTestDatabase();
    await new SQLiteSessaoTreinoRepository(db2).applyServerRows(
      await sessaoRepo.getDirty()
    );
    const repo2 = new SQLiteSessaoExercicioRepository(db2);
    await repo2.applyServerRows(dirty);

    const applied = await repo2.findById('se-1');
    expect(applied?.toPrimitives()).toMatchObject({
      nomeSnapshot: 'Supino Reto com Barra',
      cargaPadrao: 60,
      tempoDescansoSegundos: 90,
    });
  });
});

describe('SQLiteRegistroPesoRepository — sync round-trip', () => {
  it('save → getDirty → applyServerRows preserva a linha', async () => {
    const repo = new SQLiteRegistroPesoRepository(db);
    await repo.save(RegistroPeso.restore({
      id: 'rp-1',
      pesoKg: 82.5,
      dataRegistro: '2026-07-05T08:00:00.000Z',
      observacao: 'em jejum',
    }));

    const dirty = await repo.getDirty();
    expect(dirty).toHaveLength(1);
    expect(dirty[0]).toMatchObject({ id: 'rp-1', pesoKg: 82.5 });
    expect(dirty[0].createdAt).toBeTruthy();

    const db2 = createTestDatabase();
    const repo2 = new SQLiteRegistroPesoRepository(db2);
    await repo2.applyServerRows(dirty);

    const applied = await repo2.findById('rp-1');
    expect(applied?.toPrimitives()).toMatchObject({ pesoKg: 82.5, observacao: 'em jejum' });
  });
});
