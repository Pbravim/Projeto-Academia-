import type { DashboardRepository, ExercicioEvolucao } from '../../../domain/dashboard/repositories/DashboardRepository';

export type { ExercicioEvolucao };

interface Deps {
  dashboardRepository: DashboardRepository;
}

export class GetTreinoEvolucaoUseCase {
  constructor(private readonly deps: Deps) {}

  async execute(treinoId: string): Promise<ExercicioEvolucao[]> {
    return this.deps.dashboardRepository.getEvolucaoExercicios(treinoId);
  }
}
