import type { SessaoTreinoPrimitives } from '../../../domain/sessoes/entities/SessaoTreino';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';

/** Retorna a sessao de treino em andamento, ou null se nao houver nenhuma. */
export class GetSessaoAtivaUseCase {
  constructor(private readonly sessaoTreinoRepository: SessaoTreinoRepository) {}

  /** @returns a sessao ativa ou `null` se nenhuma sessao estiver em andamento */
  async execute(): Promise<SessaoTreinoPrimitives | null> {
    const sessao = await this.sessaoTreinoRepository.findAtiva();
    return sessao ? sessao.toPrimitives() : null;
  }
}
