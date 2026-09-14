import { beforeEach, describe, expect, it } from 'vitest';

import type { SQLiteDatabaseClient } from '../../../infrastructure/persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteTreinoExercicioRepository } from '../../../infrastructure/treinos/SQLiteTreinoExercicioRepository';
import { SQLiteTreinoRepository } from '../../../infrastructure/treinos/SQLiteTreinoRepository';
import { createTestDatabase } from '../../../test/db-setup';
import { ExercicioJaNoTreinoError } from '../errors/ExercicioJaNoTreinoError';

import { ConfirmarImportacaoTreinoUseCase, type ImportacaoResolvida } from './ConfirmarImportacaoTreinoUseCase';
import { CreateTreinoUseCase } from './CreateTreinoUseCase';

let db: SQLiteDatabaseClient;

beforeEach(async () => {
  db = createTestDatabase();
  await db.run(
    `INSERT INTO exercises (id, name, normalized_name, group_muscle, category, equipment, load_unit, is_custom, created_at, updated_at) VALUES
     ('ex-1', 'Agachamento', 'agachamento', 'Pernas', 'Composto', NULL, 'kg', 0, '2026-07-01T10:00:00.000Z', '2026-07-01T10:00:00.000Z'),
     ('ex-2', 'Flexao', 'flexao', 'Peito', 'Composto', NULL, 'kg', 0, '2026-07-01T10:00:00.000Z', '2026-07-01T10:00:00.000Z')`
  );
});

/**
 * Achado 1 (review-38a-1, sev3): `treino_exercicios` tem UNIQUE(treino_id, exercicio_id) e
 * `SQLiteTreinoExercicioRepository.save` usa INSERT OR REPLACE — uma proposta com o mesmo
 * exercicioId repetido silenciosamente perde linhas contra SQLite real, embora
 * `InMemoryTreinoExercicioRepository` (indexado por id) nao reproduza o bug.
 */
describe('ConfirmarImportacaoTreinoUseCase (SQLite real)', () => {
  it('circuito com exercicioId repetido rejeita e nao grava treino nem TreinoExercicio', async () => {
    const treinoRepository = new SQLiteTreinoRepository(db);
    const treinoExercicioRepository = new SQLiteTreinoExercicioRepository(db);
    const createTreino = new CreateTreinoUseCase({
      treinoRepository,
      idGenerator: () => 'treino-1',
      now: () => new Date('2026-01-01'),
    });
    const uc = new ConfirmarImportacaoTreinoUseCase({
      createTreino,
      treinoExercicioRepository,
      idGenerator: () => `te-${Math.random()}`,
      gerarGrupoId: () => `grupo-${Math.random()}`,
      database: db,
    });

    const proposta: ImportacaoResolvida = {
      nome: 'Circuito Agachamento/Flexao',
      itens: [
        { item: { nome: 'Agachamento', metodo: 'normal' }, exercicioId: 'ex-1' },
        { item: { nome: 'Flexao', metodo: 'normal' }, exercicioId: 'ex-2' },
        { item: { nome: 'Agachamento', metodo: 'normal' }, exercicioId: 'ex-1' },
      ],
    };

    await expect(uc.execute(proposta)).rejects.toBeInstanceOf(ExercicioJaNoTreinoError);

    const treinos = await db.getAll<{ id: string }>('SELECT id FROM treinos');
    expect(treinos).toHaveLength(0);
    const treinoExercicios = await db.getAll<{ id: string }>('SELECT id FROM treino_exercicios');
    expect(treinoExercicios).toHaveLength(0);
  });
});
