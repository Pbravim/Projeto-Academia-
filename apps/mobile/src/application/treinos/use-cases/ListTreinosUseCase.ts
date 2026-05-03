import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import type { TreinoRepository } from '../../../domain/treinos/repositories/TreinoRepository';

export class ListTreinosUseCase {
  constructor(private readonly treinoRepository: TreinoRepository) {}

  async execute(): Promise<TreinoPrimitives[]> {
    const treinos = await this.treinoRepository.list();
    return treinos.map((t) => t.toPrimitives());
  }
}
