export interface SessaoExercicioPrimitives {
  id: string;
  sessaoTreinoId: string;
  exercicioId: string;
  ordem: number;
  nomeSnapshot: string;
  grupoMuscularSnapshot: string;
  categoriaSnapshot: string;
  equipamentoSnapshot: string | null;
  realizado: boolean;
  seriesRecomendadas: number | null;
  execucoesRecomendadas: number | null;
  cargaPadrao: number | null;
}

export class SessaoExercicio {
  private constructor(private readonly props: SessaoExercicioPrimitives) {}

  static create(props: SessaoExercicioPrimitives): SessaoExercicio {
    return new SessaoExercicio(props);
  }

  static restore(primitives: SessaoExercicioPrimitives): SessaoExercicio {
    return new SessaoExercicio(primitives);
  }

  withRealizado(value: boolean): SessaoExercicio {
    return new SessaoExercicio({ ...this.props, realizado: value });
  }

  toPrimitives(): SessaoExercicioPrimitives {
    return { ...this.props };
  }
}
