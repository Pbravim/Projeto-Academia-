import { describe, expect, it } from 'vitest';

import { matchesExerciseQuery } from './matchesExerciseQuery';

const baseFields = {
  name: 'Supino reto',
  nameVariations: ['Bench press'],
  groupMuscles: ['Peito'],
  equipment: 'Barra olimpica',
  primaryEquipment: 'Banco reto',
  secondaryEquipment: 'Anilhas',
};

describe('matchesExerciseQuery', () => {
  it('matches on empty query regardless of fields', () => {
    expect(matchesExerciseQuery('', baseFields)).toBe(true);
    expect(matchesExerciseQuery('   ', baseFields)).toBe(true);
  });

  it('matches by name', () => {
    expect(matchesExerciseQuery('supino', baseFields)).toBe(true);
  });

  it('matches by name variation', () => {
    expect(matchesExerciseQuery('bench', baseFields)).toBe(true);
  });

  it('matches by muscle group', () => {
    expect(matchesExerciseQuery('peito', baseFields)).toBe(true);
  });

  it('matches by equipment (technogym / maquina)', () => {
    expect(
      matchesExerciseQuery('maquina', {
        ...baseFields,
        equipment: 'Maquina Technogym',
      })
    ).toBe(true);
    expect(
      matchesExerciseQuery('technogym', {
        ...baseFields,
        equipment: 'Maquina Technogym',
      })
    ).toBe(true);
  });

  it('matches by primary or secondary equipment', () => {
    expect(matchesExerciseQuery('banco reto', baseFields)).toBe(true);
    expect(matchesExerciseQuery('anilhas', baseFields)).toBe(true);
  });

  it('is accent-insensitive and case-insensitive', () => {
    expect(matchesExerciseQuery('MÁQUINA', { ...baseFields, equipment: 'Maquina' })).toBe(true);
    expect(matchesExerciseQuery('máquina', { ...baseFields, equipment: 'maquina' })).toBe(true);
  });

  it('returns false when nothing matches', () => {
    expect(matchesExerciseQuery('inexistente', baseFields)).toBe(false);
  });

  it('handles null equipment fields', () => {
    expect(
      matchesExerciseQuery('supino', {
        name: 'Supino reto',
        nameVariations: [],
        groupMuscles: ['Peito'],
        equipment: null,
        primaryEquipment: null,
        secondaryEquipment: null,
      })
    ).toBe(true);
  });
});
