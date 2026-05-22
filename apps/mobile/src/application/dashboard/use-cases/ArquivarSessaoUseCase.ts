import type { DashboardRepository } from '../../../domain/dashboard/repositories/DashboardRepository';
import { SessaoNotFoundError } from '../../sessoes/errors/SessaoNotFoundError';

interface Deps {
  dashboardRepository: DashboardRepository;
}

export class ArquivarSessaoUseCase {
  constructor(private readonly deps: Deps) {}

  async execute(sessaoId: string): Promise<void> {
    const rowsAffected = await this.deps.dashboardRepository.arquivarSessao(sessaoId);
    if (rowsAffected === 0) throw new SessaoNotFoundError(sessaoId);
  }
}
