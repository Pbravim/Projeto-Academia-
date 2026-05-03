export type SessaoStatus = 'em_andamento' | 'finalizada';

export interface SessaoTreinoPrimitives {
  id: string;
  treinoId: string;
  treinoNomeSnapshot: string;
  dataHoraInicio: string;
  dataHoraFim: string | null;
  status: SessaoStatus;
}

export interface CreateSessaoTreinoProps {
  id: string;
  treinoId: string;
  treinoNomeSnapshot: string;
  dataHoraInicio: Date;
}

export class SessaoTreino {
  private constructor(private readonly props: SessaoTreinoPrimitives) {}

  static create(input: CreateSessaoTreinoProps): SessaoTreino {
    return new SessaoTreino({
      id: input.id,
      treinoId: input.treinoId,
      treinoNomeSnapshot: input.treinoNomeSnapshot,
      dataHoraInicio: input.dataHoraInicio.toISOString(),
      dataHoraFim: null,
      status: 'em_andamento',
    });
  }

  static restore(primitives: SessaoTreinoPrimitives): SessaoTreino {
    return new SessaoTreino(primitives);
  }

  finalizar(now: Date): SessaoTreino {
    return new SessaoTreino({
      ...this.props,
      status: 'finalizada',
      dataHoraFim: now.toISOString(),
    });
  }

  isAtiva(): boolean {
    return this.props.status === 'em_andamento';
  }

  toPrimitives(): SessaoTreinoPrimitives {
    return { ...this.props };
  }
}
