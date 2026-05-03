import type { Treino } from '../../domain/treinos/entities/Treino';
import type { TreinoRepository } from '../../domain/treinos/repositories/TreinoRepository';

export class InMemoryTreinoRepository implements TreinoRepository {
  private readonly treinosById = new Map<string, Treino>();

  async save(treino: Treino): Promise<void> {
    this.treinosById.set(treino.toPrimitives().id, treino);
  }

  async list(): Promise<Treino[]> {
    return Array.from(this.treinosById.values()).sort((a, b) =>
      a.toPrimitives().name.localeCompare(b.toPrimitives().name)
    );
  }

  async findById(id: string): Promise<Treino | null> {
    return this.treinosById.get(id) ?? null;
  }

  async delete(id: string): Promise<void> {
    this.treinosById.delete(id);
  }
}
