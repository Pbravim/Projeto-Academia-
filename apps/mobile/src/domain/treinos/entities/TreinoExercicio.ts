export type MetodoExercicio = 'normal' | 'drop_set' | 'piramide' | 'rest_pause';

export interface TreinoExercicioPrimitives {
  id: string;
  treinoId: string;
  exercicioId: string;
  ordem: number;
  seriesRecomendadas: number | null;
  execucoesRecomendadas: number | null;
  cargaPadrao: number | null;
  tempoDescansoSegundos: number | null;
  metodo: MetodoExercicio;
  grupoId: string | null;
  duracaoRecomendadaSegundos: number | null;
  distanciaRecomendadaMetros: number | null;
  intensidadeRecomendada: number | null;
}

export class TreinoExercicio {
  private constructor(private readonly props: TreinoExercicioPrimitives) {}

  static create(props: TreinoExercicioPrimitives): TreinoExercicio {
    if (props.ordem < 0) {
      throw new Error('TreinoExercicio: ordem deve ser >= 0');
    }
    if (props.cargaPadrao !== null && props.cargaPadrao !== undefined && props.cargaPadrao < 0) {
      throw new Error('TreinoExercicio: cargaPadrao deve ser >= 0');
    }
    if (props.seriesRecomendadas !== null && props.seriesRecomendadas !== undefined && props.seriesRecomendadas <= 0) {
      throw new Error('TreinoExercicio: seriesRecomendadas deve ser > 0');
    }
    return new TreinoExercicio(props);
  }

  static restore(primitives: TreinoExercicioPrimitives): TreinoExercicio {
    return new TreinoExercicio(primitives);
  }

  toPrimitives(): TreinoExercicioPrimitives {
    return { ...this.props };
  }
}
