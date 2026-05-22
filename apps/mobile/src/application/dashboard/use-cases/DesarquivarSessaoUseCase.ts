import type { DashboardRepository } from '../../../domain/dashboard/repositories/DashboardRepository';
import { SessaoNotFoundError } from '../errors/SessaoNotFoundError';

interface Deps {
  dashboardRepository: DashboardRepository;
}

export class DesarquivarSessaoUseCase {
  constructor(private readonly deps: Deps) {}

  async execute(sessaoId: string): Promise<void> {
    const rowsAffected = await this.deps.dashboardRepository.desarquivarSessao(sessaoId);
    if (rowsAffected === 0) {
      throw new SessaoNotFoundError(sessaoId);
    }
  }
}
