import { beforeEach, describe, expect, it } from 'vitest';

import { RegistroPeso } from '../../domain/peso/entities/RegistroPeso';
import { SerieRegistrada } from '../../domain/sessoes/entities/SerieRegistrada';
import { SerieSegmento } from '../../domain/sessoes/entities/SerieSegmento';
import { SessaoExercicio } from '../../domain/sessoes/entities/SessaoExercicio';
import { SessaoTreino } from '../../domain/sessoes/entities/SessaoTreino';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteRegistroPesoRepository } from '../peso/SQLiteRegistroPesoRepository';

import { SQLiteSerieRegistradaRepository } from './SQLiteSerieRegistradaRepository';
import { SQLiteSerieSegmentoRepository } from './SQLiteSerieSegmentoRepository';
import { SQLiteSessaoExercicioRepository } from './SQLiteSessaoExercicioRepository';
import { SQLiteSessaoTreinoRepository } from './SQLiteSessaoTreinoRepository';

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

describe('SerieRegistrada + SerieSegmento — sync round-trip (mãe + degrau)', () => {
  it('sincroniza a série-mãe e o degrau juntos, parent-first, num device novo', async () => {
    await db.run(
      `INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, status)
       VALUES ('st-1', 'treino-1', 'Treino A', '2026-09-12T10:00:00.000Z', 'em_andamento')`
    );
    await db.run(
      `INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot)
       VALUES ('se-1', 'st-1', 'ex-1', 0, 'Supino', 'Peito', 'Composto')`
    );

    const serieRepo = new SQLiteSerieRegistradaRepository(db);
    const segmentoRepo = new SQLiteSerieSegmentoRepository(db);

    await serieRepo.save(SerieRegistrada.restore({
      id: 'serie-1', sessaoExercicioId: 'se-1', ordem: 0, tipoSerie: 'valida',
      cargaKg: 80, repeticoes: 10, duracaoSegundos: null, distanciaMetros: null,
      intensidade: null, observacao: null,
    }));
    await segmentoRepo.save(SerieSegmento.create({
      id: 'seg-1', serieId: 'serie-1', ordem: 2, cargaKg: 60, repeticoes: 6, descansoSegundos: 20,
    }));

    const dirtySeries = await serieRepo.getDirty();
    const dirtySegmentos = await segmentoRepo.getDirty();
    expect(dirtySeries).toHaveLength(1);
    expect(dirtySegmentos).toHaveLength(1);

    // Device novo: aplica a mãe antes do degrau (FK real).
    const db2 = createTestDatabase();
    await db2.run(
      `INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, status)
       VALUES ('st-1', 'treino-1', 'Treino A', '2026-09-12T10:00:00.000Z', 'em_andamento')`
    );
    await db2.run(
      `INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot)
       VALUES ('se-1', 'st-1', 'ex-1', 0, 'Supino', 'Peito', 'Composto')`
    );
    const serieRepo2 = new SQLiteSerieRegistradaRepository(db2);
    const segmentoRepo2 = new SQLiteSerieSegmentoRepository(db2);
    await serieRepo2.applyServerRows(dirtySeries);
    await segmentoRepo2.applyServerRows(dirtySegmentos);

    const mae = await serieRepo2.findById('serie-1');
    const degrau = await segmentoRepo2.findById('seg-1');
    expect(mae?.toPrimitives()).toMatchObject({ cargaKg: 80, repeticoes: 10 });
    expect(degrau?.toPrimitives()).toMatchObject({ serieId: 'serie-1', ordem: 2, cargaKg: 60, repeticoes: 6 });
  });

  it('apagar a série-mãe tombstona também o degrau (cascata explícita de soft-delete)', async () => {
    await db.run(
      `INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, status)
       VALUES ('st-2', 'treino-1', 'Treino A', '2026-09-12T10:00:00.000Z', 'em_andamento')`
    );
    await db.run(
      `INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot)
       VALUES ('se-2', 'st-2', 'ex-1', 0, 'Supino', 'Peito', 'Composto')`
    );
    const serieRepo = new SQLiteSerieRegistradaRepository(db);
    const segmentoRepo = new SQLiteSerieSegmentoRepository(db);
    await serieRepo.save(SerieRegistrada.restore({
      id: 'serie-2', sessaoExercicioId: 'se-2', ordem: 0, tipoSerie: 'valida',
      cargaKg: 80, repeticoes: 10, duracaoSegundos: null, distanciaMetros: null,
      intensidade: null, observacao: null,
    }));
    await segmentoRepo.save(SerieSegmento.create({
      id: 'seg-2', serieId: 'serie-2', ordem: 2, cargaKg: 60, repeticoes: 6,
    }));

    await serieRepo.delete('serie-2');

    expect(await segmentoRepo.findById('seg-2')).toBeNull();
  });
});
