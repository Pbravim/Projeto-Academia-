export type SubstituicaoMotivo = 'equipamento_indisponivel' | 'variacao';

export interface SessaoExercicioPrimitives {
  id: string;
  sessaoTreinoId: string;
  exercicioId: string;
  ordem: number;
  nomeSnapshot: string;
  grupoMuscularSnapshot: string;
  categoriaSnapshot: string;
  equipamentoSnapshot: string | null;
  musculoAlvoSnapshot: string[];
  movementPatternSnapshot: string | null;
  realizado: boolean;
  seriesRecomendadas: number | null;
  execucoesRecomendadas: number | null;
  cargaPadrao: number | null;
  tempoDescansoSegundos: number | null;
  metodo: 'normal' | 'drop_set' | 'piramide' | 'rest_pause';
  grupoId: string | null;
  trackingTypeSnapshot: string;
  duracaoRecomendadaSegundos: number | null;
  distanciaRecomendadaMetros: number | null;
  intensidadeRecomendada: number | null;
  // substituição
  substituidoPorExercicioId: string | null;
  substituicaoMotivo: SubstituicaoMotivo | null;
  nomeOriginalSnapshot: string | null;
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

  withMetodo(metodo: SessaoExercicioPrimitives['metodo']): SessaoExercicio {
    return new SessaoExercicio({ ...this.props, metodo });
  }

  withSubstituicao(
    novoExercicioId: string,
    novoNome: string,
    novoGrupoMuscular: string,
    novaCategoria: string,
    novoEquipamento: string | null,
    novoMusculoAlvo: string[],
    novoMovementPattern: string | null,
    motivo: SubstituicaoMotivo | null,
  ): SessaoExercicio {
    return new SessaoExercicio({
      ...this.props,
      exercicioId: novoExercicioId,
      nomeSnapshot: novoNome,
      grupoMuscularSnapshot: novoGrupoMuscular,
      categoriaSnapshot: novaCategoria,
      equipamentoSnapshot: novoEquipamento,
      musculoAlvoSnapshot: novoMusculoAlvo,
      movementPatternSnapshot: novoMovementPattern,
      cargaPadrao: null,
      seriesRecomendadas: null,
      execucoesRecomendadas: null,
      duracaoRecomendadaSegundos: null,
      distanciaRecomendadaMetros: null,
      intensidadeRecomendada: null,
      trackingTypeSnapshot: this.props.trackingTypeSnapshot,
      substituidoPorExercicioId: this.props.substituidoPorExercicioId ?? this.props.exercicioId,
      substituicaoMotivo: motivo,
      nomeOriginalSnapshot: this.props.nomeOriginalSnapshot ?? this.props.nomeSnapshot,
    });
  }

  toPrimitives(): SessaoExercicioPrimitives {
    return { ...this.props };
  }
}
