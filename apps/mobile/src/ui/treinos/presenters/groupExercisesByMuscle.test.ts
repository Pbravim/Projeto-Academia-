import { describe, expect, it } from 'vitest';

import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';

import { groupExercisesByMuscle } from './groupExercisesByMuscle';

function ex(id: string, name: string, groupMuscles: string[]): ExercisePrimitives {
  return {
    id,
    name,
    groupMuscles,
    category: 'forca',
    equipment: null,
    trackingType: 'reps_load',
    mediaLocal: null,
    mediaOnline: null,
  } as ExercisePrimitives;
}

describe('groupExercisesByMuscle', () => {
  it('ordena grupos por GROUP_ORDER, desconhecidos no fim por localeCompare, itens por nome', () => {
    const result = groupExercisesByMuscle([
      ex('1', 'Remada', ['Costas']),
      ex('2', 'Supino', ['Peito']),
      ex('3', 'Zeta', ['Zeta']),
      ex('4', 'Alfa', ['Alfa']),
      ex('5', 'Agachamento', ['Peito']),
    ]);

    expect(result.map((g) => g.group)).toEqual(['Peito', 'Costas', 'Alfa', 'Zeta']);
    expect(result.find((g) => g.group === 'Peito')?.items.map((i) => i.name)).toEqual(['Agachamento', 'Supino']);
  });

  it('exercicio sem groupMuscles cai em Outros', () => {
    const result = groupExercisesByMuscle([ex('1', 'X', [])]);

    expect(result).toEqual([{ group: 'Outros', items: [expect.objectContaining({ id: '1', name: 'X' })] }]);
  });
});
