export enum MuscleGroup {
  PEITO = 'Peito',
  COSTAS = 'Costas',
  OMBRO = 'Ombro',
  BICEPS = 'Biceps',
  TRICEPS = 'Triceps',
  ANTEBRACO = 'Antebraco',
  PEITO_SUPERIOR = 'Peito Superior',
  ABDOME = 'Abdome',
  QUADRICEPS = 'Quadriceps',
  ISQUIOTIBIAL = 'Isquiotibial',
  PANTURRILHA = 'Panturrilha',
  PERNAS = 'Pernas',
  GLÚTEOS = 'Glúteos',
}

export function normalizeGroupMuscle(value: string): string {
  const normalized = value.trim().toLowerCase();
  const match = Object.values(MuscleGroup).find(
    (g) => g.toLowerCase() === normalized
  );
  return match || value.trim();
}

export function areGroupsRelated(group1: string, group2: string): boolean {
  if (group1 === group2) return true;

  const normalized1 = normalizeGroupMuscle(group1).toLowerCase();
  const normalized2 = normalizeGroupMuscle(group2).toLowerCase();

  const relatedGroups: Record<string, string[]> = {
    [MuscleGroup.PEITO.toLowerCase()]: [
      MuscleGroup.PEITO_SUPERIOR.toLowerCase(),
      'peito superior',
    ],
    [MuscleGroup.PEITO_SUPERIOR.toLowerCase()]: [
      MuscleGroup.PEITO.toLowerCase(),
      'peito',
    ],
    [MuscleGroup.PERNAS.toLowerCase()]: [
      MuscleGroup.QUADRICEPS.toLowerCase(),
      MuscleGroup.ISQUIOTIBIAL.toLowerCase(),
      MuscleGroup.GLÚTEOS.toLowerCase(),
      MuscleGroup.PANTURRILHA.toLowerCase(),
    ],
    [MuscleGroup.QUADRICEPS.toLowerCase()]: [
      MuscleGroup.PERNAS.toLowerCase(),
    ],
    [MuscleGroup.ISQUIOTIBIAL.toLowerCase()]: [
      MuscleGroup.PERNAS.toLowerCase(),
    ],
    [MuscleGroup.GLÚTEOS.toLowerCase()]: [MuscleGroup.PERNAS.toLowerCase()],
    [MuscleGroup.PANTURRILHA.toLowerCase()]: [
      MuscleGroup.PERNAS.toLowerCase(),
    ],
    [MuscleGroup.TRICEPS.toLowerCase()]: ['antebraco'],
    [MuscleGroup.ANTEBRACO.toLowerCase()]: ['triceps'],
  };

  return relatedGroups[normalized1]?.includes(normalized2) ?? false;
}
