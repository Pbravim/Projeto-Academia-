import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import type { SerieRegistradaRepository } from '../../../domain/sessoes/repositories/SerieRegistradaRepository';
import { SessaoNotFoundError } from '../errors/SessaoNotFoundError';

interface CancelarSessaoUseCaseDependencies {
  sessaoTreinoRepository: SessaoTreinoRepository;
  sessaoExercicioRepository: SessaoExercicioRepository;
  serieRegistradaRepository: SerieRegistradaRepository;
}

/** Remove completamente uma sessao em andamento, descartando todos os dados registrados. */
export class CancelarSessaoUseCase {
  constructor(private readonly dependencies: CancelarSessaoUseCaseDependencies) {}

  /** @throws {SessaoNotFoundError} sessao nao encontrada */
  async execute(sessaoId: string): Promise<void> {
    const sessao = await this.dependencies.sessaoTreinoRepository.findById(sessaoId);
    if (!sessao) throw new SessaoNotFoundError(sessaoId);

    const exercicios = await this.dependencies.sessaoExercicioRepository.listBySessaoId(sessaoId);
    for (const exercicio of exercicios) {
      await this.dependencies.serieRegistradaRepository.deleteBySessaoExercicioId(exercicio.toPrimitives().id);
    }

    await this.dependencies.sessaoExercicioRepository.deleteBySessaoId(sessaoId);
    await this.dependencies.sessaoTreinoRepository.delete(sessaoId);
  }
}
