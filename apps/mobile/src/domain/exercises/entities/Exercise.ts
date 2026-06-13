import { normalizeText } from '../../../shared/utils/normalizeText';
import { ExerciseValidationError } from '../errors/ExerciseValidationError';

export type TrackingType = 'reps_load' | 'cardio' | 'hold' | 'reps_only';

export interface ExercisePrimitives {
  id: string;
  name: string;
  normalizedName: string;
  groupMuscles: string[];
  category: string;
  equipment: string | null;
  loadUnit: 'kg';
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
  mediaOnline: string | null;
  mediaLocal: string | null;
  // biomechanical fields (v17/v20)
  musculoAlvo: string[];
  movementPattern: string | null;
  stabilizers: string[];
  executionType: 'Unilateral' | 'Bilateral' | 'Can Be Both' | null;
  nameVariations: string[];
  primaryEquipment: string | null;
  secondaryEquipment: string | null;
  catalogVersion: number;
  trackingType: TrackingType;
}

export interface CreateExerciseProps {
  id: string;
  name: string;
  groupMuscles: string[];
  category?: string | null;
  equipment?: string | null;
  createdAt: Date;
  updatedAt?: Date;
  isCustom?: boolean;
  mediaOnline?: string | null;
  mediaLocal?: string | null;
  musculoAlvo?: string[];
  movementPattern?: string | null;
  stabilizers?: string[];
  executionType?: 'Unilateral' | 'Bilateral' | 'Can Be Both' | null;
  nameVariations?: string[];
  primaryEquipment?: string | null;
  secondaryEquipment?: string | null;
  catalogVersion?: number;
  trackingType?: TrackingType;
}

export interface UpdateExerciseProps {
  name: string;
  groupMuscles: string[];
  category?: string | null;
  equipment?: string | null;
  mediaOnline?: string | null;
  mediaLocal?: string | null;
  musculoAlvo?: string[];
  movementPattern?: string | null;
  stabilizers?: string[];
  executionType?: 'Unilateral' | 'Bilateral' | 'Can Be Both' | null;
  nameVariations?: string[];
  primaryEquipment?: string | null;
  secondaryEquipment?: string | null;
  trackingType?: TrackingType;
}

export class Exercise {
  private constructor(private readonly props: ExercisePrimitives) {}

  static create(input: CreateExerciseProps): Exercise {
    const name = requireText(input.name, 'Nome');
    const groupMuscles = requireGroups(input.groupMuscles);
    const category = normalizeOptionalText(input.category) ?? '';
    const equipment = normalizeOptionalText(input.equipment);
    const createdAt = input.createdAt.toISOString();
    const updatedAt = (input.updatedAt ?? input.createdAt).toISOString();

    const musculoAlvo = input.musculoAlvo ?? [];
    const movementPattern = input.movementPattern ?? null;
    const stabilizers = input.stabilizers ?? [];
    const executionType = input.executionType ?? null;
    const nameVariations = input.nameVariations ?? [];
    const primaryEquipment = normalizeOptionalText(input.primaryEquipment);
    const secondaryEquipment = normalizeOptionalText(input.secondaryEquipment);
    const catalogVersion = input.catalogVersion ?? 0;
    const trackingType = input.trackingType ?? 'reps_load';

    return new Exercise({
      id: input.id,
      name,
      normalizedName: normalizeText(name),
      groupMuscles,
      category,
      equipment,
      loadUnit: 'kg',
      isCustom: input.isCustom ?? true,
      createdAt,
      updatedAt,
      mediaOnline: normalizeOptionalText(input.mediaOnline),
      mediaLocal: normalizeOptionalText(input.mediaLocal),
      musculoAlvo,
      movementPattern,
      stabilizers,
      executionType,
      nameVariations,
      primaryEquipment,
      secondaryEquipment,
      catalogVersion,
      trackingType,
    });
  }

  static restore(primitives: ExercisePrimitives): Exercise {
    return new Exercise(primitives);
  }

  static update(current: ExercisePrimitives, input: UpdateExerciseProps, updatedAt: Date): Exercise {
    const name = requireText(input.name, 'Nome');
    const groupMuscles = requireGroups(input.groupMuscles);
    const category = normalizeOptionalText(input.category) ?? '';
    const equipment = normalizeOptionalText(input.equipment);

    return new Exercise({
      id: current.id,
      name,
      normalizedName: normalizeText(name),
      groupMuscles,
      category,
      equipment,
      loadUnit: current.loadUnit,
      isCustom: current.isCustom,
      createdAt: current.createdAt,
      updatedAt: updatedAt.toISOString(),
      mediaOnline: 'mediaOnline' in input ? normalizeOptionalText(input.mediaOnline) : current.mediaOnline,
      mediaLocal: 'mediaLocal' in input ? normalizeOptionalText(input.mediaLocal) : current.mediaLocal,
      musculoAlvo: 'musculoAlvo' in input ? (input.musculoAlvo ?? []) : current.musculoAlvo,
      movementPattern: 'movementPattern' in input ? (input.movementPattern ?? null) : current.movementPattern,
      stabilizers: 'stabilizers' in input ? (input.stabilizers ?? []) : current.stabilizers,
      executionType: 'executionType' in input ? (input.executionType ?? null) : current.executionType,
      nameVariations: 'nameVariations' in input ? (input.nameVariations ?? []) : current.nameVariations,
      primaryEquipment: 'primaryEquipment' in input ? normalizeOptionalText(input.primaryEquipment) : current.primaryEquipment,
      secondaryEquipment: 'secondaryEquipment' in input ? normalizeOptionalText(input.secondaryEquipment) : current.secondaryEquipment,
      catalogVersion: current.catalogVersion,
      trackingType: 'trackingType' in input ? (input.trackingType ?? 'reps_load') : current.trackingType,
    });
  }

  toPrimitives(): ExercisePrimitives {
    return { ...this.props };
  }
}

function requireGroups(values: string[]): string[] {
  const groups = (values ?? [])
    .map((g) => g.trim().replace(/\s+/g, ' '))
    .filter(Boolean);

  if (groups.length === 0) {
    throw new ExerciseValidationError('Grupo muscular e obrigatorio.');
  }

  return groups;
}

function requireText(value: string, label: string): string {
  const normalizedValue = value.trim().replace(/\s+/g, ' ');

  if (!normalizedValue) {
    throw new ExerciseValidationError(`${label} e obrigatorio.`);
  }

  if (normalizedValue.length < 2) {
    throw new ExerciseValidationError(`${label} precisa ter pelo menos 2 caracteres.`);
  }

  return normalizedValue;
}

function normalizeOptionalText(value?: string | null): string | null {
  const normalizedValue = value?.trim().replace(/\s+/g, ' ');
  return normalizedValue ? normalizedValue : null;
}
