import { describe, expect, it } from 'vitest';

import { Exercise } from './Exercise';
import { ExerciseValidationError } from '../errors/ExerciseValidationError';

describe('Exercise', () => {
  it('creates a normalized exercise ready to persist', () => {
    const exercise = Exercise.create({
      id: 'exercise_1',
      name: '  Supino   reto  ',
      groupMuscle: ' Peito ',
      category: ' Composto ',
      equipment: ' Barra olimpica ',
      createdAt: new Date('2026-04-24T12:00:00.000Z'),
    });

    expect(exercise.toPrimitives()).toEqual({
      id: 'exercise_1',
      name: 'Supino reto',
      normalizedName: 'supino reto',
      groupMuscle: 'Peito',
      category: 'Composto',
      equipment: 'Barra olimpica',
      loadUnit: 'kg',
      isCustom: true,
      createdAt: '2026-04-24T12:00:00.000Z',
      updatedAt: '2026-04-24T12:00:00.000Z',
    });
  });

  it('rejects an empty name', () => {
    expect(() =>
      Exercise.create({
        id: 'exercise_1',
        name: '   ',
        groupMuscle: 'Peito',
        category: 'Composto',
        createdAt: new Date('2026-04-24T12:00:00.000Z'),
      })
    ).toThrow(ExerciseValidationError);
  });

  it('updates fields and recomputes normalizedName', () => {
    const original = Exercise.create({
      id: 'exercise_1',
      name: 'Supino reto',
      groupMuscle: 'Peito',
      category: 'Composto',
      createdAt: new Date('2026-04-24T12:00:00.000Z'),
    });

    const updated = Exercise.update(
      original.toPrimitives(),
      { name: '  Agachamento livre  ', groupMuscle: 'Pernas', category: 'Composto' },
      new Date('2026-04-25T10:00:00.000Z')
    );

    expect(updated.toPrimitives()).toMatchObject({
      id: 'exercise_1',
      name: 'Agachamento livre',
      normalizedName: 'agachamento livre',
      groupMuscle: 'Pernas',
      createdAt: '2026-04-24T12:00:00.000Z',
      updatedAt: '2026-04-25T10:00:00.000Z',
    });
  });
});
