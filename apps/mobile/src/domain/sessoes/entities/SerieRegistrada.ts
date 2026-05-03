import { SessaoValidationError } from '../errors/SessaoValidationError';

export type TipoSerie = 'aquecimento' | 'valida';

export interface SerieRegistradaPrimitives {
  id: string;
  sessaoExercicioId: string;
  tipoSerie: TipoSerie;
  ordem: number;
  cargaKg: number;
  repeticoes: number;
  observacao: string | null;
}

export interface CreateSerieRegistradaProps {
  id: string;
  sessaoExercicioId: string;
  tipoSerie: TipoSerie;
  ordem: number;
  cargaKg: number;
  repeticoes: number;
  observacao?: string;
}

export class SerieRegistrada {
  private constructor(private readonly props: SerieRegistradaPrimitives) {}

  static create(input: CreateSerieRegistradaProps): SerieRegistrada {
    if (!Number.isFinite(input.cargaKg) || input.cargaKg < 0) {
      throw new SessaoValidationError('Carga deve ser um numero igual ou maior que 0.');
    }

    if (!Number.isInteger(input.repeticoes) || input.repeticoes < 1) {
      throw new SessaoValidationError('Repeticoes deve ser um numero inteiro maior que 0.');
    }

    const observacao = input.observacao?.trim() || null;

    return new SerieRegistrada({
      id: input.id,
      sessaoExercicioId: input.sessaoExercicioId,
      tipoSerie: input.tipoSerie,
      ordem: input.ordem,
      cargaKg: input.cargaKg,
      repeticoes: input.repeticoes,
      observacao,
    });
  }

  static restore(primitives: SerieRegistradaPrimitives): SerieRegistrada {
    return new SerieRegistrada(primitives);
  }

  toPrimitives(): SerieRegistradaPrimitives {
    return { ...this.props };
  }
}
