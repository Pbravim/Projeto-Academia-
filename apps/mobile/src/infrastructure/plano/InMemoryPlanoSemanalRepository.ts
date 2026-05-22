import type { DiaSemana } from '../../domain/plano/entities/DiaSemana';
import { DIAS_SEMANA } from '../../domain/plano/entities/DiaSemana';
import type { PlanoSemanal, PlanoSemanalRepository } from '../../domain/plano/repositories/PlanoSemanalRepository';

/**
 * In-memory implementation of PlanoSemanalRepository for testing and MVP scenarios.
 * Stores the weekly training plan in memory without persistence.
 */
export class InMemoryPlanoSemanalRepository implements PlanoSemanalRepository {
  private plano: PlanoSemanal = {
    seg: null,
    ter: null,
    qua: null,
    qui: null,
    sex: null,
    sab: null,
    dom: null,
  };

  async getPlano(): Promise<PlanoSemanal> {
    return { ...this.plano };
  }

  async setDia(dia: DiaSemana, treinoId: string | null): Promise<void> {
    if (!DIAS_SEMANA.includes(dia)) {
      throw new Error(`Dia inválido: ${dia}`);
    }
    this.plano[dia] = treinoId;
  }

  /**
   * Test helper: set multiple dias at once
   */
  async setPlano(plano: Partial<PlanoSemanal>): Promise<void> {
    this.plano = { ...this.plano, ...plano };
  }

  /**
   * Test helper: reset to empty plan
   */
  async reset(): Promise<void> {
    this.plano = {
      seg: null,
      ter: null,
      qua: null,
      qui: null,
      sex: null,
      sab: null,
      dom: null,
    };
  }
}
