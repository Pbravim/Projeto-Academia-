import { normalizeText } from '../../shared/utils/normalizeText';

export interface ExerciseQueryFields {
  name: string;
  nameVariations: string[];
  groupMuscles: string[];
  equipment: string | null;
  primaryEquipment: string | null;
  secondaryEquipment: string | null;
}

export function matchesExerciseQuery(query: string, fields: ExerciseQueryFields): boolean {
  const q = normalizeText(query);
  if (q.length === 0) return true;

  const haystacks: string[] = [
    fields.name,
    ...fields.nameVariations,
    ...fields.groupMuscles,
    fields.equipment ?? '',
    fields.primaryEquipment ?? '',
    fields.secondaryEquipment ?? '',
  ];

  return haystacks.some((value) => normalizeText(value).includes(q));
}
