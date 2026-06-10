import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import type { UltimaExecucaoValida } from '../../../domain/historico/repositories/HistoricoRepository';

export interface ExerciseCardViewModel {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  ultimoPeso: string | null;
  nameVariations: string[];
}

export interface ExerciseSectionViewModel {
  groupMuscle: string;
  cards: ExerciseCardViewModel[];
}

export interface ExerciseCatalogViewModel {
  sections: ExerciseSectionViewModel[];
  /** Flat list kept for backwards compat with tests that check card structure */
  cards: ExerciseCardViewModel[];
  emptyStateMessage: string | null;
}

// Canonical order for main muscle groups; anything else goes to the end alphabetically
const GROUP_ORDER: string[] = [
  'Peito', 'Costas', 'Ombros', 'Biceps', 'Triceps',
  'Quadriceps', 'Posterior', 'Gluteos', 'Panturrilha',
  'Abdomen', 'Trapezio', 'Antebraco',
];

function groupOrder(group: string): number {
  const idx = GROUP_ORDER.indexOf(group);
  return idx === -1 ? GROUP_ORDER.length : idx;
}

export type CatalogSortMode = 'nome' | 'ultimo_uso';

export function buildExerciseCatalogViewModel(
  exercises: ExercisePrimitives[],
  ultimosPesos: Map<string, UltimaExecucaoValida> = new Map(),
  sortMode: CatalogSortMode = 'nome'
): ExerciseCatalogViewModel {
  if (exercises.length === 0) {
    return {
      sections: [],
      cards: [],
      emptyStateMessage: 'Nenhum exercicio cadastrado ainda. Comece criando o primeiro.',
    };
  }

  const byGroup = new Map<string, ExerciseCardViewModel[]>();

  for (const exercise of exercises) {
    const groups = exercise.groupMuscles;
    const groupLabel = exercise.groupMuscles.join(', ');
    const ultima = ultimosPesos.get(exercise.id);
    const card: ExerciseCardViewModel = {
      id: exercise.id,
      title: exercise.name,
      subtitle: exercise.category ? `${groupLabel} · ${exercise.category}` : groupLabel,
      meta: exercise.equipment ? `Equipamento: ${exercise.equipment}` : 'Equipamento livre',
      ultimoPeso: ultima ? `Ultimo: ${ultima.cargaKg} kg × ${ultima.repeticoes} rep` : null,
      nameVariations: exercise.nameVariations,
    };
    for (const group of groups) {
      const list = byGroup.get(group) ?? [];
      list.push(card);
      byGroup.set(group, list);
    }
  }

  const sections: ExerciseSectionViewModel[] = Array.from(byGroup.entries())
    .sort(([a], [b]) => {
      const diff = groupOrder(a) - groupOrder(b);
      return diff !== 0 ? diff : a.localeCompare(b);
    })
    .map(([groupMuscle, cards]) => ({
      groupMuscle,
      cards: sortMode === 'ultimo_uso'
        ? [...cards].sort((a, b) => {
            const da = ultimosPesos.get(a.id)?.dataExecucao ?? '';
            const db = ultimosPesos.get(b.id)?.dataExecucao ?? '';
            if (!da && !db) return a.title.localeCompare(b.title);
            if (!da) return 1;
            if (!db) return -1;
            return db.localeCompare(da);
          })
        : [...cards].sort((a, b) => a.title.localeCompare(b.title)),
    }));

  return {
    sections,
    cards: sections.flatMap((s) => s.cards),
    emptyStateMessage: null,
  };
}
