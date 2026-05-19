import type { PlanoSemanal, PlanoSemanalRepository } from '../../../domain/plano/repositories/PlanoSemanalRepository';

export class GetPlanoSemanalUseCase {
  constructor(private readonly repository: PlanoSemanalRepository) {}

  execute(): Promise<PlanoSemanal> {
    return this.repository.getPlano();
  }
}
