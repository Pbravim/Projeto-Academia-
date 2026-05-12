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
        musculoAlvo: null,
        mediaOnline: null,
        mediaLocal: null,
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

  it('exercicio com multiplos grupos aparece em todas as secoes correspondentes', () => {
    const viewModel = buildExerciseCatalogViewModel([
      {
        id: 'exercise_1',
        name: 'Supino fechado',
        normalizedName: 'supino fechado',
        groupMuscle: 'Peito, Triceps',
        category: 'Composto',
        equipment: 'Barra olimpica',
        loadUnit: 'kg',
        isCustom: false,
        createdAt: '2026-04-24T12:00:00.000Z',
        updatedAt: '2026-04-24T12:00:00.000Z',
        musculoAlvo: null,
        mediaOnline: null,
        mediaLocal: null,
      },
    ]);

    const sectionNames = viewModel.sections.map((s) => s.groupMuscle);
    expect(sectionNames).toContain('Peito');
    expect(sectionNames).toContain('Triceps');

    const peitoSection = viewModel.sections.find((s) => s.groupMuscle === 'Peito')!;
    const tricepsSection = viewModel.sections.find((s) => s.groupMuscle === 'Triceps')!;
    expect(peitoSection.cards[0].id).toBe('exercise_1');
    expect(tricepsSection.cards[0].id).toBe('exercise_1');
  });
});
