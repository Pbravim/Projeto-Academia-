import type { DiaSemana } from '../../../domain/plano/entities/DiaSemana';
import type { PlanoSemanalRepository } from '../../../domain/plano/repositories/PlanoSemanalRepository';

export class SetDiaPlanoUseCase {
  constructor(private readonly repository: PlanoSemanalRepository) {}

  execute(dia: DiaSemana, treinoId: string | null): Promise<void> {
    const normalizado = typeof treinoId === 'string' && treinoId.trim() === '' ? null : treinoId;
    return this.repository.setDia(dia, normalizado);
  }
}
