import { SessaoValidationError } from '../errors/SessaoValidationError';

export interface SerieSegmentoPrimitives {
  id: string;
  serieId: string;
  ordem: number;
  cargaKg: number | null;
  repeticoes: number | null;
  descansoSegundos: number | null;
}

export interface CreateSerieSegmentoProps {
  id: string;
  serieId: string;
  ordem: number;
  cargaKg: number;
  repeticoes: number;
  descansoSegundos?: number;
}

/**
 * Degrau de um metodo (drop set, rest-pause, piramide) aplicado sobre uma serie-mae
 * (`SerieRegistrada`, degrau 1). Existe apenas para exercicios `reps_load` — cardio/hold/
 * reps_only nao tem degrau (validado no use case, nao aqui).
 */
export class SerieSegmento {
  private constructor(private readonly props: SerieSegmentoPrimitives) {}

  static create(input: CreateSerieSegmentoProps): SerieSegmento {
    if (!Number.isInteger(input.ordem) || input.ordem < 2) {
      throw new SessaoValidationError('Ordem do segmento deve ser um numero inteiro maior ou igual a 2.');
    }
    if (!Number.isFinite(input.cargaKg) || input.cargaKg < 0) {
      throw new SessaoValidationError('Carga deve ser um numero igual ou maior que 0.');
    }
    if (!Number.isInteger(input.repeticoes) || input.repeticoes < 1) {
      throw new SessaoValidationError('Repeticoes deve ser um numero inteiro maior que 0.');
    }
    if (input.descansoSegundos !== undefined) {
      if (!Number.isInteger(input.descansoSegundos) || input.descansoSegundos < 0) {
        throw new SessaoValidationError('Descanso deve ser um numero inteiro de segundos igual ou maior que 0.');
      }
    }

    return new SerieSegmento({
      id: input.id,
      serieId: input.serieId,
      ordem: input.ordem,
      cargaKg: input.cargaKg,
      repeticoes: input.repeticoes,
      descansoSegundos: input.descansoSegundos ?? null,
    });
  }

  static restore(primitives: SerieSegmentoPrimitives): SerieSegmento {
    return new SerieSegmento(primitives);
  }

  toPrimitives(): SerieSegmentoPrimitives {
    return { ...this.props };
  }
}
