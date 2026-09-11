import { beforeEach, describe, expect, it } from 'vitest';

import { Exercise } from '../../../domain/exercises/entities/Exercise';
import { Treino } from '../../../domain/treinos/entities/Treino';
import { SQLiteExerciseRepository } from '../../../infrastructure/exercises/SQLiteExerciseRepository';
import type { SQLiteDatabaseClient } from '../../../infrastructure/persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteTreinoExercicioRepository } from '../../../infrastructure/treinos/SQLiteTreinoExercicioRepository';
import { SQLiteTreinoRepository } from '../../../infrastructure/treinos/SQLiteTreinoRepository';
import { createTestDatabase } from '../../../test/db-setup';

import { AddExercicioAoTreinoUseCase } from './AddExercicioAoTreinoUseCase';

/**
 * Regressão P2-2/P2-3 (auditoria rodada 3):
 * - Re-adicionar exercício removido conflitava no UNIQUE(treino_id, exercicio_id)
 *   e o INSERT OR REPLACE apagava FISICAMENTE o tombstone ainda não pushado —
 *   a deleção nunca chegava ao servidor e o pull ressuscitava/duplicava.
 * - `ordem` era count(vivos)+1: remover o 1º de 3 e re-adicionar gerava ordem
 *   duplicada (lista não determinística).
 */

const T = '2026-07-01T10:00:00.000Z';

let db: SQLiteDatabaseClient;
let teRepo: SQLiteTreinoExercicioRepository;
let useCase: AddExercicioAoTreinoUseCase;
let nextId: number;

function exercicio(id: string, name: string) {
  return Exercise.restore({
    id, name, normalizedName: name.toLowerCase(), groupMuscles: ['Peito'],
    category: 'Composto', equipment: null, loadUnit: 'kg', isCustom: true,
    createdAt: T, updatedAt: T, mediaOnline: null, mediaLocal: null,
    musculoAlvo: [], movementPattern: null, stabilizers: [], executionType: null,
    nameVariations: [], primaryEquipment: null, secondaryEquipment: null,
    catalogVersion: 0, trackingType: 'reps_load',
  });
}

beforeEach(async () => {
  db = createTestDatabase();
  const treinoRepository = new SQLiteTreinoRepository(db);
  const exerciseRepository = new SQLiteExerciseRepository(db);
  teRepo = new SQLiteTreinoExercicioRepository(db);
  nextId = 0;

  await treinoRepository.save(Treino.restore({ id: 'tr-1', name: 'Treino A', objetivo: null, createdAt: T, updatedAt: T }));
  await exerciseRepository.save(exercicio('ex-1', 'Supino'));
  await exerciseRepository.save(exercicio('ex-2', 'Crucifixo'));

  useCase = new AddExercicioAoTreinoUseCase({
    treinoRepository,
    treinoExercicioRepository: teRepo,
    exerciseRepository,
    idGenerator: () => `te-${++nextId}`,
    database: db,
  });
});

describe('re-adicionar exercício removido', () => {
  it('reativa o tombstone (mesma linha, dirty=1) em vez de destruí-lo', async () => {
    const criado = await useCase.execute({ treinoId: 'tr-1', exercicioId: 'ex-1' });
    await teRepo.delete(criado.id); // tombstone dirty=1, ainda não pushado

    await useCase.execute({ treinoId: 'tr-1', exercicioId: 'ex-1' });

    const rows = await db.getAll<{ id: string; deleted_at: string | null; dirty: number }>(
      `SELECT id, deleted_at, dirty FROM treino_exercicios WHERE treino_id = 'tr-1' AND exercicio_id = 'ex-1'`,
    );
    expect(rows).toHaveLength(1); // nenhum tombstone destruído nem linha duplicada
    expect(rows[0].id).toBe(criado.id); // mesma linha reativada
    expect(rows[0].deleted_at).toBeNull();
    expect(rows[0].dirty).toBe(1);
  });
});

describe('ordem após remoção do meio', () => {
  it('usa MAX(ordem)+1 incluindo soft-deletadas — nunca colide', async () => {
    const a = await useCase.execute({ treinoId: 'tr-1', exercicioId: 'ex-1' });
    const b = await useCase.execute({ treinoId: 'tr-1', exercicioId: 'ex-2' });
    expect([a.ordem, b.ordem]).toEqual([1, 2]);

    await teRepo.delete(a.id); // remove o primeiro (soft)

    // Re-adicionar não pode ganhar ordem 2 (colidiria com o ex-2 vivo).
    const readd = await useCase.execute({ treinoId: 'tr-1', exercicioId: 'ex-1' });
    expect(readd.ordem).toBe(3);

    const vivos = await db.getAll<{ ordem: number }>(
      `SELECT ordem FROM treino_exercicios WHERE treino_id = 'tr-1' AND deleted_at IS NULL ORDER BY ordem`,
    );
    expect(new Set(vivos.map((v) => v.ordem)).size).toBe(vivos.length);
  });
});
