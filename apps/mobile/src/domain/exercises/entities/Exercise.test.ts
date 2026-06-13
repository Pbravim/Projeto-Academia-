import { describe, expect, it } from 'vitest';

import { Exercise } from './Exercise';
import { ExerciseValidationError } from '../errors/ExerciseValidationError';

describe('Exercise', () => {
  it('creates a normalized exercise ready to persist', () => {
    const exercise = Exercise.create({
      id: 'exercise_1',
      name: '  Supino   reto  ',
      groupMuscles: ['Peito'],
      category: ' Composto ',
      equipment: ' Barra olimpica ',
      createdAt: new Date('2026-04-24T12:00:00.000Z'),
    });

    expect(exercise.toPrimitives()).toEqual({
      id: 'exercise_1',
      name: 'Supino reto',
      normalizedName: 'supino reto',
      groupMuscles: ['Peito'],
      category: 'Composto',
      equipment: 'Barra olimpica',
      loadUnit: 'kg',
      isCustom: true,
      createdAt: '2026-04-24T12:00:00.000Z',
      updatedAt: '2026-04-24T12:00:00.000Z',
      mediaOnline: null,
      mediaLocal: null,
      musculoAlvo: [],
      movementPattern: null,
      stabilizers: [],
      executionType: null,
      nameVariations: [],
      primaryEquipment: null,
      secondaryEquipment: null,
      catalogVersion: 0,
      trackingType: 'reps_load',
    });
  });

  it('rejects an empty name', () => {
    expect(() =>
      Exercise.create({
        id: 'exercise_1',
        name: '   ',
        groupMuscles: ['Peito'],
        category: 'Composto',
        createdAt: new Date('2026-04-24T12:00:00.000Z'),
      })
    ).toThrow(ExerciseValidationError);
  });

  it('creates an exercise with biomechanical fields', () => {
    const exercise = Exercise.create({
      id: 'ex-bio-1',
      name: 'Supino Reto com Barra',
      groupMuscles: ['Peito', 'Triceps', 'Ombros'],
      category: 'Composto',
      equipment: 'Barra olimpica',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      movementPattern: 'Horizontal Push',
      musculoAlvo: ['peitoral_medio', 'peitoral_esternal'],
      stabilizers: ['rotador_externo', 'serratus_anterior'],
      executionType: 'Bilateral',
      nameVariations: ['Supino Reto', 'Bench Press', 'Barbell Bench Press'],
      primaryEquipment: 'Barbell',
      secondaryEquipment: 'Flat Bench',
      catalogVersion: 1,
    });

    const p = exercise.toPrimitives();
    expect(p.movementPattern).toBe('Horizontal Push');
    expect(p.musculoAlvo).toEqual(['peitoral_medio', 'peitoral_esternal']);
    expect(p.stabilizers).toEqual(['rotador_externo', 'serratus_anterior']);
    expect(p.executionType).toBe('Bilateral');
    expect(p.nameVariations).toEqual(['Supino Reto', 'Bench Press', 'Barbell Bench Press']);
    expect(p.primaryEquipment).toBe('Barbell');
    expect(p.secondaryEquipment).toBe('Flat Bench');
    expect(p.catalogVersion).toBe(1);
  });

  it('defaults new fields to empty/null when not provided', () => {
    const exercise = Exercise.create({
      id: 'ex-bio-2',
      name: 'Supino Reto',
      groupMuscles: ['Peito'],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const p = exercise.toPrimitives();
    expect(p.movementPattern).toBeNull();
    expect(p.musculoAlvo).toEqual([]);
    expect(p.stabilizers).toEqual([]);
    expect(p.executionType).toBeNull();
    expect(p.nameVariations).toEqual([]);
    expect(p.primaryEquipment).toBeNull();
    expect(p.secondaryEquipment).toBeNull();
    expect(p.catalogVersion).toBe(0);
    expect(p.trackingType).toBe('reps_load');
  });

  it('updates fields and recomputes normalizedName', () => {
    const original = Exercise.create({
      id: 'exercise_1',
      name: 'Supino reto',
      groupMuscles: ['Peito'],
      category: 'Composto',
      createdAt: new Date('2026-04-24T12:00:00.000Z'),
    });

    const updated = Exercise.update(
      original.toPrimitives(),
      { name: '  Agachamento livre  ', groupMuscles: ['Pernas'], category: 'Composto' },
      new Date('2026-04-25T10:00:00.000Z')
    );

    expect(updated.toPrimitives()).toMatchObject({
      id: 'exercise_1',
      name: 'Agachamento livre',
      normalizedName: 'agachamento livre',
      groupMuscles: ['Pernas'],
      createdAt: '2026-04-24T12:00:00.000Z',
      updatedAt: '2026-04-25T10:00:00.000Z',
    });
  });
});
