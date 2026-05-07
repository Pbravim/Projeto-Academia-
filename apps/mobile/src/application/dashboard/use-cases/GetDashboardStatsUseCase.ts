import type {
  DashboardRepository,
  DashboardStats,
  DiaAderencia,
  EvolucaoPorTreino,
  RecordeItem,
  SessaoComVolume,
} from '../../../domain/dashboard/repositories/DashboardRepository';

export type { DashboardStats, DiaAderencia, EvolucaoPorTreino, RecordeItem, SessaoComVolume };

interface GetDashboardStatsDependencies {
  dashboardRepository: DashboardRepository;
}

/** Agrega estatísticas de treino para o dashboard de evolução. */
export class GetDashboardStatsUseCase {
  constructor(private readonly deps: GetDashboardStatsDependencies) {}

  async execute(): Promise<DashboardStats> {
    return this.deps.dashboardRepository.getStats();
  }
}
