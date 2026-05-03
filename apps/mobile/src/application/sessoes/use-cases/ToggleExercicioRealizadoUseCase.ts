import type { SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import { SessaoEncerradaError } from '../errors/SessaoEncerradaError';
import { SessaoExercicioNotFoundError } from '../errors/SessaoExercicioNotFoundError';

interface ToggleExercicioRealizadoUseCaseDependencies {
  sessaoTreinoRepository: SessaoTreinoRepository;
  sessaoExercicioRepository: SessaoExercicioRepository;
}

/** Alterna o campo `realizado` de um exercicio da sessao. Permite marcar como nao realizado (pulo). */
export class ToggleExercicioRealizadoUseCase {
  constructor(private readonly dependencies: ToggleExercicioRealizadoUseCaseDependencies) {}

  /**
   * @throws {SessaoExercicioNotFoundError} exercicio da sessao nao encontrado
   * @throws {SessaoEncerradaError} sessao ja foi finalizada
   */
  async execute(sessaoExercicioId: string): Promise<SessaoExercicioPrimitives> {
    const sessaoExercicio = await this.dependencies.sessaoExercicioRepository.findById(
      sessaoExercicioId
    );
    if (!sessaoExercicio) throw new SessaoExercicioNotFoundError(sessaoExercicioId);

    const sessao = await this.dependencies.sessaoTreinoRepository.findById(
      sessaoExercicio.toPrimitives().sessaoTreinoId
    );
    if (!sessao?.isAtiva()) throw new SessaoEncerradaError();

    const updated = sessaoExercicio.withRealizado(!sessaoExercicio.toPrimitives().realizado);
    await this.dependencies.sessaoExercicioRepository.save(updated);

    return updated.toPrimitives();
  }
}
