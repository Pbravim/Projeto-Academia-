import { SessaoValidationError } from '../errors/SessaoValidationError';

export interface SerieRegistradaPrimitives {
  id: string;
  sessaoExercicioId: string;
  tipoSerie: 'valida' | 'aquecimento';
  ordem: number;
  cargaKg: number | null;
  repeticoes: number | null;
  observacao: string | null;
  duracaoSegundos: number | null;
  distanciaMetros: number | null;
  intensidade: number | null;
}

export interface CreateSerieRegistradaProps {
  id: string;
  sessaoExercicioId: string;
  tipoSerie?: 'valida' | 'aquecimento';
  ordem: number;
  cargaKg?: number;
  repeticoes?: number;
  observacao?: string;
  duracaoSegundos?: number;
  distanciaMetros?: number;
  intensidade?: number;
  trackingType?: 'reps_load' | 'cardio' | 'hold' | 'reps_only';
}

export class SerieRegistrada {
  private constructor(private readonly props: SerieRegistradaPrimitives) {}

  static create(input: CreateSerieRegistradaProps): SerieRegistrada {
    const trackingType = input.trackingType ?? 'reps_load';
    const observacao = input.observacao?.trim() || null;

    let cargaKg: number | null = null;
    let repeticoes: number | null = null;
    let duracaoSegundos: number | null = null;
    let distanciaMetros: number | null = null;
    let intensidade: number | null = null;

    switch (trackingType) {
      case 'reps_load':
        if (!Number.isFinite(input.cargaKg) || input.cargaKg! < 0) {
          throw new SessaoValidationError('Carga deve ser um numero igual ou maior que 0.');
        }
        if (!Number.isInteger(input.repeticoes) || input.repeticoes! < 1) {
          throw new SessaoValidationError('Repeticoes deve ser um numero inteiro maior que 0.');
        }
        cargaKg = input.cargaKg!;
        repeticoes = input.repeticoes!;
        break;

      case 'cardio':
        if (!Number.isInteger(input.duracaoSegundos) || input.duracaoSegundos! < 1) {
          throw new SessaoValidationError('Duracao deve ser um numero inteiro de segundos maior que 0.');
        }
        duracaoSegundos = input.duracaoSegundos!;
        if (input.intensidade !== undefined) {
          if (!Number.isFinite(input.intensidade) || input.intensidade < 0) {
            throw new SessaoValidationError('Intensidade deve ser um numero igual ou maior que 0.');
          }
          intensidade = input.intensidade;
        }
        if (input.distanciaMetros !== undefined) {
          if (!Number.isFinite(input.distanciaMetros) || input.distanciaMetros < 0) {
            throw new SessaoValidationError('Distancia deve ser um numero igual ou maior que 0.');
          }
          distanciaMetros = input.distanciaMetros;
        }
        break;

      case 'hold':
        if (!Number.isInteger(input.duracaoSegundos) || input.duracaoSegundos! < 1) {
          throw new SessaoValidationError('Duracao deve ser um numero inteiro de segundos maior que 0.');
        }
        duracaoSegundos = input.duracaoSegundos!;
        break;

      case 'reps_only':
        if (!Number.isInteger(input.repeticoes) || input.repeticoes! < 1) {
          throw new SessaoValidationError('Repeticoes deve ser um numero inteiro maior que 0.');
        }
        repeticoes = input.repeticoes!;
        break;
    }

    return new SerieRegistrada({
      id: input.id,
      sessaoExercicioId: input.sessaoExercicioId,
      tipoSerie: input.tipoSerie ?? 'valida',
      ordem: input.ordem,
      cargaKg,
      repeticoes,
      observacao,
      duracaoSegundos,
      distanciaMetros,
      intensidade,
    });
  }

  static restore(primitives: SerieRegistradaPrimitives): SerieRegistrada {
    return new SerieRegistrada(primitives);
  }

  toPrimitives(): SerieRegistradaPrimitives {
    return { ...this.props };
  }
}
