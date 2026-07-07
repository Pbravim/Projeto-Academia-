import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteExerciseRepository } from './SQLiteExerciseRepository';
import { Exercise } from '../../domain/exercises/entities/Exercise';

/**
 * Regressão P0 (auditoria rodada 3, 2026-07-06): save()/applyServerRows() usavam
 * INSERT OR REPLACE em exercises. REPLACE = DELETE+INSERT, e o DELETE dispara o
 * ON DELETE CASCADE das 3 tabelas de alternativas — cada edição de exercício
 * (ou pull do sync) apagava silenciosamente todos os links de alternativas.
 *
 * Também cobre o P1: listAlternativas não filtrava ea.deleted_at, tornando
 * removeAlternativa inócuo.
 */

let db: SQLiteDatabaseClient;
let repo: SQLiteExerciseRepository;

function novoExercicio(id: string, name: string) {
  return Exercise.restore({
    id,
    name,
    normalizedName: name.toLowerCase(),
    groupMuscles: ['Peito'],
    category: 'Composto',
    equipment: null,
    loadUnit: 'kg',
    isCustom: true,
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
    mediaOnline: null,
    mediaLocal: null,
    musculoAlvo: ['Peitoral maior'],
    movementPattern: null,
    stabilizers: [],
    executionType: null,
    nameVariations: [],
    primaryEquipment: null,
    secondaryEquipment: null,
    catalogVersion: 0,
    trackingType: 'reps_load',
  });
}

beforeEach(async () => {
  db = createTestDatabase();
  repo = new SQLiteExerciseRepository(db);
  await repo.save(novoExercicio('test-ex-a', 'Exercicio A'));
  await repo.save(novoExercicio('test-ex-b', 'Exercicio B'));
});

describe('SQLiteExerciseRepository — REPLACE não pode disparar CASCADE', () => {
  it('save() de um exercício existente preserva as alternativas manuais', async () => {
    await repo.addAlternativa('test-ex-a', 'test-ex-b');

    // Edição do exercício (mesmo id) — antes, REPLACE apagava o link via CASCADE.
    await repo.save(novoExercicio('test-ex-a', 'Exercicio A editado'));

    const alternativas = await repo.listAlternativas('test-ex-a');
    expect(alternativas.map((e) => e.toPrimitives().id)).toEqual(['test-ex-b']);
  });

  it('save() preserva as alternativas equivalentes e de grupo muscular', async () => {
    await repo.addEquivalentAlternativa('test-ex-a', 'test-ex-b');
    await repo.addMuscleGroupAlternativa('test-ex-a', 'test-ex-b');

    await repo.save(novoExercicio('test-ex-a', 'Exercicio A editado'));

    expect((await repo.listEquivalentAlternativas('test-ex-a')).length).toBe(1);
    expect((await repo.listMuscleGroupAlternativas('test-ex-a')).length).toBe(1);
  });

  it('applyServerRows() de um exercício existente preserva as alternativas', async () => {
    await repo.addEquivalentAlternativa('test-ex-a', 'test-ex-b');

    await repo.applyServerRows([{
      id: 'test-ex-a',
      name: 'Exercicio A do servidor',
      normalizedName: 'exercicio a do servidor',
      groupMuscle: 'Peito',
      category: 'Composto',
      equipment: null,
      loadUnit: 'kg',
      isCustom: true,
      mediaOnline: null,
      mediaLocal: null,
      musculoAlvo: '["Peitoral maior"]',
      movementPattern: null,
      stabilizers: '[]',
      executionType: null,
      nameVariations: '[]',
      primaryEquipment: null,
      secondaryEquipment: null,
      catalogVersion: 0,
      trackingType: 'reps_load',
      createdAt: '2026-07-01T10:00:00.000Z',
      updatedAt: '2026-07-02T10:00:00.000Z',
      deletedAt: null,
    }]);

    const aplicado = await repo.findById('test-ex-a');
    expect(aplicado?.toPrimitives().name).toBe('Exercicio A do servidor');
    expect((await repo.listEquivalentAlternativas('test-ex-a')).length).toBe(1);
  });
});

describe('SQLiteExerciseRepository — removeAlternativa precisa ter efeito', () => {
  it('listAlternativas não devolve links soft-deletados', async () => {
    await repo.addAlternativa('test-ex-a', 'test-ex-b');
    await repo.removeAlternativa('test-ex-a', 'test-ex-b');

    const alternativas = await repo.listAlternativas('test-ex-a');
    expect(alternativas).toHaveLength(0);
  });

  it('re-adicionar depois de remover volta a listar', async () => {
    await repo.addAlternativa('test-ex-a', 'test-ex-b');
    await repo.removeAlternativa('test-ex-a', 'test-ex-b');
    await repo.addAlternativa('test-ex-a', 'test-ex-b');

    const alternativas = await repo.listAlternativas('test-ex-a');
    expect(alternativas.map((e) => e.toPrimitives().id)).toEqual(['test-ex-b']);
  });
});
