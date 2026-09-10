import type { SugestaoRepository } from '../../../domain/sugestoes/repositories/SugestaoRepository';
import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import type { PlanoSemanalRepository } from '../../../domain/plano/repositories/PlanoSemanalRepository';
import { diaSemanaHoje } from '../../../domain/plano/entities/DiaSemana';

export type SugestaoFonte = 'plano' | 'rotacao';

export interface SugestaoTreino {
  treino: TreinoPrimitives;
  ultimaSessao: string | null;
  fonte: SugestaoFonte;
}

interface Deps {
  dashboardRepository: SugestaoRepository;
  planoRepository?: PlanoSemanalRepository;
}

/**
 * SugerirTreinoUseCase - Suggests a training plan for the user.
 *
 * This use case is in the 'sugestoes' module to separate concerns from 'sessoes'.
 * While it uses DashboardRepository (from domain/dashboard), it's focused on
 * suggesting trainings rather than managing dashboard state, so it lives here.
 *
 * Depende de SugestaoRepository (domain/sugestoes), não do DashboardRepository
 * inteiro: dos 7 métodos daquele, este use case usa 2. O
 * SqliteDashboardRepository satisfaz a porta estruturalmente, então o wiring
 * continua passando o mesmo objeto.
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
