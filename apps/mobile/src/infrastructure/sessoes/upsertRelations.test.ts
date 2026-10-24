import { beforeEach, describe, expect, it } from 'vitest';

import { SerieRegistrada } from '../../domain/sessoes/entities/SerieRegistrada';
import { SerieSegmento } from '../../domain/sessoes/entities/SerieSegmento';
import { SessaoExercicio } from '../../domain/sessoes/entities/SessaoExercicio';
import { Treino } from '../../domain/treinos/entities/Treino';
import { TreinoExercicio } from '../../domain/treinos/entities/TreinoExercicio';
import { createTestDatabase } from '../../test/db-setup';
import { progressaoDetalhe, progressaoSerie } from '../../test/progressaoFixtures';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteTreinoExercicioRepository } from '../treinos/SQLiteTreinoExercicioRepository';
import { SQLiteTreinoRepository } from '../treinos/SQLiteTreinoRepository';

import { SQLiteSerieRegistradaRepository } from './SQLiteSerieRegistradaRepository';
import { SQLiteSerieSegmentoRepository } from './SQLiteSerieSegmentoRepository';
import { SQLiteSessaoExercicioRepository } from './SQLiteSessaoExercicioRepository';

let db: SQLiteDatabaseClient;
beforeEach(async () => {
  db = createTestDatabase();
  for (const suffix of ['1', '2']) {
    await db.run('INSERT INTO treinos (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)', [`t${suffix}`, 'Treino', '2000', '2000']);
    await db.run('INSERT INTO exercises (id, name, normalized_name, group_muscle, category, load_unit, is_custom, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)',
      [`ex${suffix}`, `Supino${suffix}`, `supino${suffix}`, 'peito', 'composto', 'kg', '2000', '2000']);
    await db.run('INSERT INTO sessao_treinos (id, treino_nome_snapshot, data_hora_inicio, status) VALUES (?, ?, ?, ?)',
      [`s${suffix}`, 'Treino', '2026-10-01T10:00:00Z', 'em_andamento']);
    await db.run('INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot) VALUES (?, ?, ?, 1, ?, ?, ?)',
      [`se${suffix}`, `s${suffix}`, `ex${suffix}`, 'Supino', 'peito', 'composto']);
    await db.run('INSERT INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes) VALUES (?, ?, ?, 1, 60, 6)',
      [`sr${suffix}`, `se${suffix}`, 'valida']);
  }
});

describe('upserts preserve sync revision while updating relationship columns (#62)', () => {
  it('updates and clears persisted cardio duration, distance and intensity', async () => {
    const repo = new SQLiteSerieRegistradaRepository(db);
    const original = SerieRegistrada.create({
      id: 'cardio', sessaoExercicioId: 'se1', ordem: 2, trackingType: 'cardio',
      duracaoSegundos: 180, distanciaMetros: 800, intensidade: 4,
    });
    await repo.save(original);
    await db.run("UPDATE series_registradas SET server_rev = 7, deleted_at = '2000' WHERE id = 'cardio'");
    await repo.save(SerieRegistrada.restore({ ...original.toPrimitives(), duracaoSegundos: 90, distanciaMetros: 400, intensidade: 7 }));
    const select = 'SELECT duracao_segundos, distancia_metros, intensidade, server_rev, deleted_at FROM series_registradas WHERE id = ?';
    expect(await db.getFirst(select, ['cardio'])).toEqual({
      duracao_segundos: 90, distancia_metros: 400, intensidade: 7, server_rev: 7, deleted_at: null,
    });
    await repo.save(SerieRegistrada.restore({ ...original.toPrimitives(), duracaoSegundos: null, distanciaMetros: null, intensidade: null }));
    expect(await db.getFirst(select, ['cardio'])).toEqual({
      duracao_segundos: null, distancia_metros: null, intensidade: null, server_rev: 7, deleted_at: null,
    });
  });

  it('updates both workout-exercise foreign keys', async () => {
    const repo = new SQLiteTreinoExercicioRepository(db);
    const original = TreinoExercicio.create({
      id: 'te', treinoId: 't1', exercicioId: 'ex1', ordem: 1, seriesRecomendadas: null,
      execucoesRecomendadas: null, cargaPadrao: null, tempoDescansoSegundos: null, metodo: 'normal', grupoId: null,
      duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null,
    });
    await repo.save(original);
    await db.run("UPDATE treino_exercicios SET server_rev = 7, deleted_at = '2000' WHERE id = 'te'");
    await repo.save(TreinoExercicio.restore({ ...original.toPrimitives(), treinoId: 't2', exercicioId: 'ex2' }));
    expect(await db.getFirst('SELECT treino_id, exercicio_id, server_rev, deleted_at FROM treino_exercicios WHERE id = ?', ['te']))
      .toEqual({ treino_id: 't2', exercicio_id: 'ex2', server_rev: 7, deleted_at: null });
  });

  it('updates both session-exercise foreign keys', async () => {
    const repo = new SQLiteSessaoExercicioRepository(db);
    const original = { ...progressaoDetalhe().exercicios[0].sessaoExercicio, id: 'new-se', sessaoTreinoId: 's1', exercicioId: 'ex1' };
    await repo.save(SessaoExercicio.restore(original));
    await db.run("UPDATE sessao_exercicios SET server_rev = 7 WHERE id = 'new-se'");
    await repo.save(SessaoExercicio.restore({ ...original, sessaoTreinoId: 's2', exercicioId: 'ex2' }));
    expect(await db.getFirst('SELECT sessao_treino_id, exercicio_id, server_rev FROM sessao_exercicios WHERE id = ?', ['new-se']))
      .toEqual({ sessao_treino_id: 's2', exercicio_id: 'ex2', server_rev: 7 });
  });

  it('updates the parent of a recorded set', async () => {
    const repo = new SQLiteSerieRegistradaRepository(db);
    const original = progressaoSerie({ id: 'new-sr', sessaoExercicioId: 'se1' });
    await repo.save(SerieRegistrada.restore(original));
    await db.run("UPDATE series_registradas SET server_rev = 7 WHERE id = 'new-sr'");
    await repo.save(SerieRegistrada.restore({ ...original, sessaoExercicioId: 'se2' }));
    expect(await db.getFirst('SELECT sessao_exercicio_id, server_rev FROM series_registradas WHERE id = ?', ['new-sr']))
      .toEqual({ sessao_exercicio_id: 'se2', server_rev: 7 });
  });

  it('updates a segment parent without resetting its creation timestamp', async () => {
    const repo = new SQLiteSerieSegmentoRepository(db);
    const original = SerieSegmento.create({ id: 'seg', serieId: 'sr1', ordem: 2, cargaKg: 40, repeticoes: 5 });
    await repo.save(original);
    await db.run("UPDATE serie_segmentos SET server_rev = 7, created_at = '2000-01-01T00:00:00Z' WHERE id = 'seg'");
    await repo.save(SerieSegmento.restore({ ...original.toPrimitives(), serieId: 'sr2' }));
    expect(await db.getFirst('SELECT serie_id, server_rev, created_at FROM serie_segmentos WHERE id = ?', ['seg']))
      .toEqual({ serie_id: 'sr2', server_rev: 7, created_at: '2000-01-01T00:00:00Z' });
  });

  it('updates the creation date supplied by the workout domain object', async () => {
    const repo = new SQLiteTreinoRepository(db);
    const original = Treino.create({ id: 'new-t', name: 'Treino', createdAt: new Date('2026-10-01T10:00:00Z') });
    await repo.save(original);
    await db.run("UPDATE treinos SET server_rev = 7 WHERE id = 'new-t'");
    await repo.save(Treino.restore({ ...original.toPrimitives(), createdAt: '2026-10-02T10:00:00Z' }));
    expect(await db.getFirst('SELECT created_at, server_rev FROM treinos WHERE id = ?', ['new-t']))
      .toEqual({ created_at: '2026-10-02T10:00:00Z', server_rev: 7 });
  });
});
