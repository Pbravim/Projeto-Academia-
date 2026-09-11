import type { DashboardRepository } from '../../../domain/dashboard/repositories/DashboardRepository';
import { diaSemanaHoje } from '../../../domain/plano/entities/DiaSemana';
import type { PlanoSemanalRepository } from '../../../domain/plano/repositories/PlanoSemanalRepository';
import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';

export type SugestaoFonte = 'plano' | 'rotacao';

export interface SugestaoTreino {
  treino: TreinoPrimitives;
  ultimaSessao: string | null;
  fonte: SugestaoFonte;
}

interface Deps {
  dashboardRepository: DashboardRepository;
  planoRepository?: PlanoSemanalRepository;
}

/**
 * SugerirTreinoUseCase - Suggests a training plan for the user.
 *
 * This use case is in the 'sugestoes' module to separate concerns from 'sessoes'.
 * While it uses DashboardRepository (from domain/dashboard), it's focused on
 * suggesting trainings rather than managing dashboard state, so it lives here.
 *
 * TODO (future): Consider creating a dedicated SugestaoRepository to reduce
 * coupling with DashboardRepository methods.
 */
export class SugerirTreinoUseCase {
  constructor(private readonly deps: Deps) {}

  async execute(): Promise<SugestaoTreino | null> {
    if (this.deps.planoRepository) {
      const plano = await this.deps.planoRepository.getPlano();
      const treinoIdHoje = plano[diaSemanaHoje()];
      if (treinoIdHoje) {
        const row = await this.deps.dashboardRepository.findTreinoComUltimaSessao(treinoIdHoje);
        if (row) {
          return {
            treino: { id: row.id, name: row.name, objetivo: row.objetivo, createdAt: row.createdAt, updatedAt: row.updatedAt },
            ultimaSessao: row.ultimaSessao,
            fonte: 'plano',
          };
        }
      }
    }

    const row = await this.deps.dashboardRepository.findSugestaoRotacao();
    if (!row) return null;

    return {
      treino: { id: row.id, name: row.name, objetivo: row.objetivo, createdAt: row.createdAt, updatedAt: row.updatedAt },
      ultimaSessao: row.ultimaSessao,
      fonte: 'rotacao',
    };
  }
}
