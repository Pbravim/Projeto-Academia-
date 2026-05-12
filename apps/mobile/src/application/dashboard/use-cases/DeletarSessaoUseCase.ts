import type { DashboardRepository } from '../../../domain/dashboard/repositories/DashboardRepository';

interface Deps {
  dashboardRepository: DashboardRepository;
}

export class DeletarSessaoUseCase {
  constructor(private readonly deps: Deps) {}

  async execute(sessaoId: string): Promise<void> {
    await this.deps.dashboardRepository.deletarSessao(sessaoId);
  }
}
