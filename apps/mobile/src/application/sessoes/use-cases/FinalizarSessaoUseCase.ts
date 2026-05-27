import type { SessaoTreinoPrimitives } from '../../../domain/sessoes/entities/SessaoTreino';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import { SessaoEncerradaError } from '../errors/SessaoEncerradaError';
import { SessaoNotFoundError } from '../errors/SessaoNotFoundError';

interface FinalizarSessaoUseCaseDependencies {
  sessaoTreinoRepository: SessaoTreinoRepository;
  now: () => Date;
}

/** Encerra uma sessao de treino ativa, registrando dataHoraFim e mudando status para "finalizada". */
export class FinalizarSessaoUseCase {
  constructor(private readonly dependencies: FinalizarSessaoUseCaseDependencies) {}

  /** @throws {SessaoNotFoundError} sessao nao encontrada */
  async execute(sessaoId: string): Promise<SessaoTreinoPrimitives> {
    const sessao = await this.dependencies.sessaoTreinoRepository.findById(sessaoId);
    if (!sessao) throw new SessaoNotFoundError(sessaoId);
    if (!sessao.isAtiva()) throw new SessaoEncerradaError();

    const finalizada = sessao.finalizar(this.dependencies.now());
    await this.dependencies.sessaoTreinoRepository.save(finalizada);

    return finalizada.toPrimitives();
  }
}
