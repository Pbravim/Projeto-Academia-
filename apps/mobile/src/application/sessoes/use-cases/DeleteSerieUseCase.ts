import type { SerieRegistradaRepository } from '../../../domain/sessoes/repositories/SerieRegistradaRepository';
import { SerieNotFoundError } from '../errors/SerieNotFoundError';

interface DeleteSerieUseCaseDependencies {
  serieRegistradaRepository: SerieRegistradaRepository;
}

/** Remove uma serie registrada. Usado para corrigir lancamentos errados durante a sessao ativa. */
export class DeleteSerieUseCase {
  constructor(private readonly dependencies: DeleteSerieUseCaseDependencies) {}

  /** @throws {SerieNotFoundError} serie nao encontrada */
  async execute(serieId: string): Promise<void> {
    const serie = await this.dependencies.serieRegistradaRepository.findById(serieId);
    if (!serie) throw new SerieNotFoundError(serieId);

    await this.dependencies.serieRegistradaRepository.delete(serieId);
  }
}
