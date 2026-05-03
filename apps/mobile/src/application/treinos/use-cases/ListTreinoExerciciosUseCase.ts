import type { TreinoExercicioPrimitives } from '../../../domain/treinos/entities/TreinoExercicio';
import type { TreinoExercicioRepository } from '../../../domain/treinos/repositories/TreinoExercicioRepository';

export class ListTreinoExerciciosUseCase {
  constructor(private readonly treinoExercicioRepository: TreinoExercicioRepository) {}

  async execute(treinoId: string): Promise<TreinoExercicioPrimitives[]> {
    const items = await this.treinoExercicioRepository.listByTreinoId(treinoId);
    return items.map((item) => item.toPrimitives());
  }
}
