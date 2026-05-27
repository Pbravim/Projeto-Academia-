import type { SerieRegistradaRepository } from '../../../domain/sessoes/repositories/SerieRegistradaRepository';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import { SessaoEncerradaError } from '../errors/SessaoEncerradaError';
import { SerieNotFoundError } from '../errors/SerieNotFoundError';

interface DeleteSerieUseCaseDependencies {
  serieRegistradaRepository: SerieRegistradaRepository;
  sessaoExercicioRepository?: SessaoExercicioRepository;
  sessaoTreinoRepository?: SessaoTreinoRepository;
}

/** Remove uma serie registrada. Usado para corrigir lancamentos errados durante a sessao ativa. */
export class DeleteSerieUseCase {
  constructor(private readonly dependencies: DeleteSerieUseCaseDependencies) {}

  /** @throws {SerieNotFoundError} serie nao encontrada */
  async execute(serieId: string): Promise<void> {
    const serie = await this.dependencies.serieRegistradaRepository.findById(serieId);
    if (!serie) throw new SerieNotFoundError(serieId);

    // Check if the session is still active before deleting
    const seriePrim = serie.toPrimitives();
    if (this.dependencies.sessaoExercicioRepository) {
      const sessaoExercicio = await this.dependencies.sessaoExercicioRepository.findById(
        seriePrim.sessaoExercicioId
      );
      if (sessaoExercicio && this.dependencies.sessaoTreinoRepository) {
        const sessaoPrim = sessaoExercicio.toPrimitives();
        const sessao = await this.dependencies.sessaoTreinoRepository.findById(sessaoPrim.sessaoTreinoId);
        if (sessao && !sessao.isAtiva()) {
          throw new SessaoEncerradaError();
        }
      }
    }

    await this.dependencies.serieRegistradaRepository.delete(serieId);
  }
}
