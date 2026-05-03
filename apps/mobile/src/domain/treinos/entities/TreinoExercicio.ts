export interface TreinoExercicioPrimitives {
  id: string;
  treinoId: string;
  exercicioId: string;
  ordem: number;
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
