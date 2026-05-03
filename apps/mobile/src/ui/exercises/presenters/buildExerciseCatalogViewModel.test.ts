import { describe, expect, it } from 'vitest';

import { buildExerciseCatalogViewModel } from './buildExerciseCatalogViewModel';

describe('buildExerciseCatalogViewModel', () => {
  it('returns an empty state when there are no exercises', () => {
    const viewModel = buildExerciseCatalogViewModel([]);

    expect(viewModel.cards).toEqual([]);
    expect(viewModel.emptyStateMessage).toContain('Nenhum exercicio cadastrado');
  });

  it('maps exercises into cards ready for the screen', () => {
    const viewModel = buildExerciseCatalogViewModel([
      {
        id: 'exercise_1',
        name: 'Remada curvada',
        normalizedName: 'remada curvada',
        groupMuscle: 'Costas',
        category: 'Composto',
        equipment: 'Barra reta',
        loadUnit: 'kg',
        isCustom: true,
        createdAt: '2026-04-24T12:00:00.000Z',
        updatedAt: '2026-04-24T12:00:00.000Z',
      },
    ]);

    expect(viewModel.emptyStateMessage).toBeNull();
    expect(viewModel.cards[0]).toEqual({
      id: 'exercise_1',
      title: 'Remada curvada',
      subtitle: 'Costas · Composto',
      meta: 'Equipamento: Barra reta',
      ultimoPeso: null,
    });
  });
});
