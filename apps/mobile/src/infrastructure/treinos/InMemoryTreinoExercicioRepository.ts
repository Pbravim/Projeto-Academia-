import { TreinoExercicio } from '../../domain/treinos/entities/TreinoExercicio';
import type { TreinoExercicioRepository } from '../../domain/treinos/repositories/TreinoExercicioRepository';

export class InMemoryTreinoExercicioRepository implements TreinoExercicioRepository {
  private readonly itemsById = new Map<string, TreinoExercicio>();

  async save(treinoExercicio: TreinoExercicio): Promise<void> {
    this.itemsById.set(treinoExercicio.toPrimitives().id, treinoExercicio);
  }

  async listByTreinoId(treinoId: string): Promise<TreinoExercicio[]> {
    return Array.from(this.itemsById.values())
      .filter((item) => item.toPrimitives().treinoId === treinoId)
      .sort((a, b) => a.toPrimitives().ordem - b.toPrimitives().ordem);
  }

  async findById(id: string): Promise<TreinoExercicio | null> {
    return this.itemsById.get(id) ?? null;
  }

  async findByTreinoIdAndExercicioId(
    treinoId: string,
    exercicioId: string
  ): Promise<TreinoExercicio | null> {
    for (const item of this.itemsById.values()) {
      const p = item.toPrimitives();
      if (p.treinoId === treinoId && p.exercicioId === exercicioId) {
        return item;
      }
    }
    return null;
  }

  async countByTreinoId(treinoId: string): Promise<number> {
    let count = 0;
    for (const item of this.itemsById.values()) {
      if (item.toPrimitives().treinoId === treinoId) count++;
    }
    return count;
  }

  async updateOrdem(id: string, ordem: number): Promise<void> {
    const item = this.itemsById.get(id);
    if (!item) return;
    this.itemsById.set(id, TreinoExercicio.restore({ ...item.toPrimitives(), ordem }));
  }

  async updateRecomendacoes(id: string, seriesRecomendadas: number | null, execucoesRecomendadas: number | null): Promise<void> {
    const item = this.itemsById.get(id);
    if (!item) return;
    this.itemsById.set(id, TreinoExercicio.restore({ ...item.toPrimitives(), seriesRecomendadas, execucoesRecomendadas }));
  }

  async delete(id: string): Promise<void> {
    this.itemsById.delete(id);
  }

  async deleteByTreinoId(treinoId: string): Promise<void> {
    for (const [id, item] of this.itemsById.entries()) {
      if (item.toPrimitives().treinoId === treinoId) {
        this.itemsById.delete(id);
      }
    }
  }
}
