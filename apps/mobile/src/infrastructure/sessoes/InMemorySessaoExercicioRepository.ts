import { SessaoExercicio } from '../../domain/sessoes/entities/SessaoExercicio';
import type { SessaoExercicioRepository } from '../../domain/sessoes/repositories/SessaoExercicioRepository';

export class InMemorySessaoExercicioRepository implements SessaoExercicioRepository {
  private readonly itemsById = new Map<string, SessaoExercicio>();

  async save(sessaoExercicio: SessaoExercicio): Promise<void> {
    this.itemsById.set(sessaoExercicio.toPrimitives().id, sessaoExercicio);
  }

  async findById(id: string): Promise<SessaoExercicio | null> {
    return this.itemsById.get(id) ?? null;
  }

  async findBySessaoIdAndExercicioId(
    sessaoId: string,
    exercicioId: string
  ): Promise<SessaoExercicio | null> {
    for (const item of this.itemsById.values()) {
      const p = item.toPrimitives();
      if (p.sessaoTreinoId === sessaoId && p.exercicioId === exercicioId) return item;
    }
    return null;
  }

  async listBySessaoId(sessaoId: string): Promise<SessaoExercicio[]> {
    return Array.from(this.itemsById.values())
      .filter((item) => item.toPrimitives().sessaoTreinoId === sessaoId)
      .sort((a, b) => a.toPrimitives().ordem - b.toPrimitives().ordem);
  }

  async countBySessaoId(sessaoId: string): Promise<number> {
    let count = 0;
    for (const item of this.itemsById.values()) {
      if (item.toPrimitives().sessaoTreinoId === sessaoId) count++;
    }
    return count;
  }

  async deleteBySessaoId(sessaoId: string): Promise<void> {
    for (const [id, item] of this.itemsById.entries()) {
      if (item.toPrimitives().sessaoTreinoId === sessaoId) this.itemsById.delete(id);
    }
  }

  async deleteByExercicioId(exercicioId: string): Promise<void> {
    for (const [id, item] of this.itemsById.entries()) {
      if (item.toPrimitives().exercicioId === exercicioId) this.itemsById.delete(id);
    }
  }

  async deleteByTreinoId(_treinoId: string): Promise<void> {
    // In-memory: este repo não conhece o treino das sessões (só sessaoTreinoId).
    // A cascata real é coberta pelos testes SQLite (DeleteTreinoUseCase.cascade.p1.test.ts).
  }
}
