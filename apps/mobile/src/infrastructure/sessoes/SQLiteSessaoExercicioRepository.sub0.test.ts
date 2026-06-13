import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteSessaoExercicioRepository } from './SQLiteSessaoExercicioRepository';
import { SessaoExercicio } from '../../domain/sessoes/entities/SessaoExercicio';

let db: SQLiteDatabaseClient;
let repo: SQLiteSessaoExercicioRepository;

beforeEach(() => {
  db = createTestDatabase();
  repo = new SQLiteSessaoExercicioRepository(db);
});

function make(id: string, sessaoId: string, exId: string): SessaoExercicio {
  return SessaoExercicio.restore({
    id, sessaoTreinoId: sessaoId, exercicioId: exId, ordem: 0,
    nomeSnapshot: 'X', grupoMuscularSnapshot: 'Peito', categoriaSnapshot: 'Composto',
    equipamentoSnapshot: null, musculoAlvoSnapshot: [], movementPatternSnapshot: null, realizado: false,
    seriesRecomendadas: null, execucoesRecomendadas: null, cargaPadrao: null,
    tempoDescansoSegundos: null, metodo: 'normal', grupoId: null,
    trackingTypeSnapshot: 'reps_load', duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null,
    substituidoPorExercicioId: null, substituicaoMotivo: null, nomeOriginalSnapshot: null,
  });
}

describe('SQLiteSessaoExercicioRepository soft-delete', () => {
  it('deleteBySessaoId tombstones; reads hide them', async () => {
    await repo.save(make('se1', 's1', 'e1'));
    await repo.save(make('se2', 's1', 'e2'));
    await repo.deleteBySessaoId('s1');
    expect(await repo.listBySessaoId('s1')).toHaveLength(0);
    expect(await repo.countBySessaoId('s1')).toBe(0);
    expect(await repo.findById('se1')).toBeNull();
  });

  it('deleteByExercicioId tombstones matching rows', async () => {
    await repo.save(make('se1', 's1', 'e1'));
    await repo.deleteByExercicioId('e1');
    expect(await repo.findBySessaoIdAndExercicioId('s1', 'e1')).toBeNull();
  });
});
