import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteTreinoExercicioRepository } from './SQLiteTreinoExercicioRepository';
import { TreinoExercicio } from '../../domain/treinos/entities/TreinoExercicio';

let db: SQLiteDatabaseClient;
let repo: SQLiteTreinoExercicioRepository;

beforeEach(() => {
  db = createTestDatabase();
  repo = new SQLiteTreinoExercicioRepository(db);
});

function make(id: string, treinoId: string, exId: string): TreinoExercicio {
  return TreinoExercicio.restore({
    id, treinoId, exercicioId: exId, ordem: 0,
    seriesRecomendadas: null, execucoesRecomendadas: null, cargaPadrao: null,
    tempoDescansoSegundos: null, metodo: 'normal', grupoId: null,
    duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null,
  });
}

describe('SQLiteTreinoExercicioRepository soft-delete', () => {
  it('hides tombstoned rows from listByTreinoId and count', async () => {
    await repo.save(make('te1', 'tr1', 'ex1'));
    await repo.save(make('te2', 'tr1', 'ex2'));
    await repo.deleteByTreinoId('tr1');
    expect(await repo.listByTreinoId('tr1')).toHaveLength(0);
    expect(await repo.countByTreinoId('tr1')).toBe(0);
  });

  it('delete tombstones a single row', async () => {
    await repo.save(make('te1', 'tr1', 'ex1'));
    await repo.delete('te1');
    expect(await repo.findById('te1')).toBeNull();
    const row = await db.getFirst<{ deleted_at: string | null }>(
      'SELECT deleted_at FROM treino_exercicios WHERE id = ?', ['te1']
    );
    expect(row?.deleted_at).toMatch(/Z$/);
  });
});
