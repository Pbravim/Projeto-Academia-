import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import type { UltimaExecucaoValida } from '../../../domain/historico/repositories/HistoricoRepository';
import { type AppLocale,translate } from '../../shared/i18n/core';
import { metadataLabel } from '../exerciseMetadataLabels';

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

// Canonical order for main muscle groups; unknown muscle groups go just after,
// and non-strength category sections (Cardio etc.) are ordered after all of them.
const GROUP_ORDER: string[] = [
  'Peito', 'Costas', 'Ombros', 'Biceps', 'Triceps',
  'Quadriceps', 'Posterior', 'Gluteos', 'Panturrilha',
  'Abdomen', 'Trapezio', 'Antebraco',
];

// Category sections (used by non-strength exercises) always render after the
// muscle-group sections, in this canonical order.
const CATEGORY_ORDER: string[] = [
  'Cardio', 'Mobilidade', 'Alongamento', 'Aquecimento', 'Reabilitacao',
];

function groupOrder(group: string): number {
  const muscleIdx = GROUP_ORDER.indexOf(group);
  if (muscleIdx !== -1) return muscleIdx;
  const categoryIdx = CATEGORY_ORDER.indexOf(group);
  if (categoryIdx !== -1) return GROUP_ORDER.length + 1 + categoryIdx;
  // Unknown muscle group: after the known muscles, before category sections.
  return GROUP_ORDER.length;
}

export type CatalogSortMode = 'nome' | 'ultimo_uso';

export function buildExerciseCatalogViewModel(
  exercises: ExercisePrimitives[],
  ultimosPesos: Map<string, UltimaExecucaoValida> = new Map(),
  sortMode: CatalogSortMode = 'nome',
  locale: AppLocale = 'pt-BR'
): ExerciseCatalogViewModel {
  if (exercises.length === 0) {
    return {
      sections: [],
      cards: [],
      emptyStateMessage: translate(locale, 'exercises.catalog.emptyStateMessage'),
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
      subtitle: exercise.category ? `${groupLabel} · ${metadataLabel('category', exercise.category, locale)}` : groupLabel,
      meta: exercise.equipment
        ? translate(locale, 'exercises.catalog.equipamentoLabel', { equipamento: metadataLabel('equipment', exercise.equipment, locale) })
        : translate(locale, 'exercises.catalog.equipamentoLivre'),
      ultimoPeso: ultima
        ? translate(locale, 'exercises.catalog.ultimoLabel', { carga: ultima.cargaKg, reps: ultima.repeticoes })
        : null,
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
