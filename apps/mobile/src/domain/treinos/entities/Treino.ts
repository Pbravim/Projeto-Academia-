import { TreinoValidationError } from '../errors/TreinoValidationError';

export interface TreinoPrimitives {
  id: string;
  name: string;
  objetivo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTreinoProps {
  id: string;
  name: string;
  objetivo?: string | null;
  createdAt: Date;
  updatedAt?: Date;
}

export interface UpdateTreinoProps {
  name: string;
  objetivo?: string | null;
}

export class Treino {
  private constructor(private readonly props: TreinoPrimitives) {}

  static create(input: CreateTreinoProps): Treino {
    const name = requireText(input.name, 'Nome');
    const objetivo = normalizeOptionalText(input.objetivo);
    const createdAt = input.createdAt.toISOString();
    const updatedAt = (input.updatedAt ?? input.createdAt).toISOString();

    return new Treino({ id: input.id, name, objetivo, createdAt, updatedAt });
  }

  static restore(primitives: TreinoPrimitives): Treino {
    return new Treino(primitives);
  }

  static update(current: TreinoPrimitives, input: UpdateTreinoProps, updatedAt: Date): Treino {
    const name = requireText(input.name, 'Nome');
    const objetivo = normalizeOptionalText(input.objetivo);

    return new Treino({
      id: current.id,
      name,
      objetivo,
      createdAt: current.createdAt,
      updatedAt: updatedAt.toISOString(),
    });
  }

  toPrimitives(): TreinoPrimitives {
    return { ...this.props };
  }
}

function requireText(value: string, label: string): string {
  const normalized = value.trim().replace(/\s+/g, ' ');

  if (!normalized) {
    throw new TreinoValidationError(`${label} e obrigatorio.`);
  }

  if (normalized.length < 2) {
    throw new TreinoValidationError(`${label} precisa ter pelo menos 2 caracteres.`);
  }

  return normalized;
}

function normalizeOptionalText(value?: string | null): string | null {
  const normalized = value?.trim().replace(/\s+/g, ' ');
  return normalized ? normalized : null;
}
