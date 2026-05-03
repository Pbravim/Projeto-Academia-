import { PesoValidationError } from '../errors/PesoValidationError';

export interface RegistroPesoPrimitives {
  id: string;
  pesoKg: number;
  dataRegistro: string;
  observacao: string | null;
}

export interface CreateRegistroPesoProps {
  id: string;
  pesoKg: number;
  dataRegistro: Date;
  observacao?: string | null;
}

export class RegistroPeso {
  private constructor(private readonly props: RegistroPesoPrimitives) {}

  static create(input: CreateRegistroPesoProps): RegistroPeso {
    if (!Number.isFinite(input.pesoKg) || input.pesoKg <= 0) {
      throw new PesoValidationError('Peso deve ser um valor positivo.');
    }

    const observacao = normalizeOptionalText(input.observacao);

    return new RegistroPeso({
      id: input.id,
      pesoKg: input.pesoKg,
      dataRegistro: input.dataRegistro.toISOString(),
      observacao,
    });
  }

  static restore(primitives: RegistroPesoPrimitives): RegistroPeso {
    return new RegistroPeso(primitives);
  }

  toPrimitives(): RegistroPesoPrimitives {
    return { ...this.props };
  }
}

function normalizeOptionalText(value?: string | null): string | null {
  const normalized = value?.trim().replace(/\s+/g, ' ');
  return normalized ? normalized : null;
}
