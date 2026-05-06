export interface TreinoExercicioPrimitives {
  id: string;
  treinoId: string;
  exercicioId: string;
  ordem: number;
  seriesRecomendadas: number | null;
  execucoesRecomendadas: number | null;
  cargaPadrao: number | null;
  tempoDescansoSegundos: number | null;
}

export class TreinoExercicio {
  private constructor(private readonly props: TreinoExercicioPrimitives) {}

  static create(props: TreinoExercicioPrimitives): TreinoExercicio {
    return new TreinoExercicio(props);
  }

  static restore(primitives: TreinoExercicioPrimitives): TreinoExercicio {
    return new TreinoExercicio(primitives);
  }

  toPrimitives(): TreinoExercicioPrimitives {
    return { ...this.props };
  }
}
