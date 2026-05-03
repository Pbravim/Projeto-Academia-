import { normalizeText } from '../../../shared/utils/normalizeText';
import { ExerciseValidationError } from '../errors/ExerciseValidationError';

export interface ExercisePrimitives {
  id: string;
  name: string;
  normalizedName: string;
  groupMuscle: string;
  category: string;
  equipment: string | null;
  loadUnit: 'kg';
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExerciseProps {
  id: string;
  name: string;
  groupMuscle: string;
  category: string;
  equipment?: string | null;
  createdAt: Date;
  updatedAt?: Date;
  isCustom?: boolean;
}

export interface UpdateExerciseProps {
  name: string;
  groupMuscle: string;
  category: string;
  equipment?: string | null;
}

export class Exercise {
  private constructor(private readonly props: ExercisePrimitives) {}

  static create(input: CreateExerciseProps): Exercise {
    const name = requireText(input.name, 'Nome');
    const groupMuscle = requireText(input.groupMuscle, 'Grupo muscular');
    const category = requireText(input.category, 'Categoria');
    const equipment = normalizeOptionalText(input.equipment);
    const createdAt = input.createdAt.toISOString();
    const updatedAt = (input.updatedAt ?? input.createdAt).toISOString();

    return new Exercise({
      id: input.id,
      name,
      normalizedName: normalizeText(name),
      groupMuscle,
      category,
      equipment,
      loadUnit: 'kg',
      isCustom: input.isCustom ?? true,
      createdAt,
      updatedAt,
    });
  }

  static restore(primitives: ExercisePrimitives): Exercise {
    return new Exercise(primitives);
  }

  static update(current: ExercisePrimitives, input: UpdateExerciseProps, updatedAt: Date): Exercise {
    const name = requireText(input.name, 'Nome');
    const groupMuscle = requireText(input.groupMuscle, 'Grupo muscular');
    const category = requireText(input.category, 'Categoria');
    const equipment = normalizeOptionalText(input.equipment);

    return new Exercise({
      id: current.id,
      name,
      normalizedName: normalizeText(name),
      groupMuscle,
      category,
      equipment,
      loadUnit: current.loadUnit,
      isCustom: current.isCustom,
      createdAt: current.createdAt,
      updatedAt: updatedAt.toISOString(),
    });
  }

  toPrimitives(): ExercisePrimitives {
    return { ...this.props };
  }
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
