import type { SerieRegistradaRepository } from '../../../domain/sessoes/repositories/SerieRegistradaRepository';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import type { SQLiteDatabaseClient } from '../../../infrastructure/persistence/sqlite/SQLiteDatabaseClient';
import { SessaoEncerradaError } from '../errors/SessaoEncerradaError';
import { SessaoNotFoundError } from '../errors/SessaoNotFoundError';

interface CancelarSessaoUseCaseDependencies {
  sessaoTreinoRepository: SessaoTreinoRepository;
  sessaoExercicioRepository?: SessaoExercicioRepository;
  serieRegistradaRepository?: SerieRegistradaRepository;
  database?: SQLiteDatabaseClient;
}

/** Cancela uma sessao em andamento, preservando os dados registrados para histórico. */
export class CancelarSessaoUseCase {
  constructor(private readonly dependencies: CancelarSessaoUseCaseDependencies) {}

  /** @throws {SessaoNotFoundError} sessao nao encontrada */
  async execute(sessaoId: string): Promise<void> {
    const sessao = await this.dependencies.sessaoTreinoRepository.findById(sessaoId);
    if (!sessao) throw new SessaoNotFoundError(sessaoId);
    if (!sessao.isAtiva()) throw new SessaoEncerradaError();

    const cancelada = sessao.cancelar();
    await this.dependencies.sessaoTreinoRepository.save(cancelada);
  }
}
