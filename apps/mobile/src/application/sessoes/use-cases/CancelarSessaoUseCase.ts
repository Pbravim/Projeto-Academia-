import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import type { SerieRegistradaRepository } from '../../../domain/sessoes/repositories/SerieRegistradaRepository';
import { SessaoEncerradaError } from '../errors/SessaoEncerradaError';
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
    if (!sessao.isAtiva()) throw new SessaoEncerradaError();

    const exercicios = await this.dependencies.sessaoExercicioRepository.listBySessaoId(sessaoId);
    const exercicioIds = exercicios.map((e) => e.toPrimitives().id);
    await this.dependencies.serieRegistradaRepository.deleteBySessaoExercicioIds(exercicioIds);
    await this.dependencies.sessaoExercicioRepository.deleteBySessaoId(sessaoId);
    await this.dependencies.sessaoTreinoRepository.delete(sessaoId);
  }
}
