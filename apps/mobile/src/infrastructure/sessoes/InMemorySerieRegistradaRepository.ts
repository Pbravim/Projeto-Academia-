import { SerieRegistrada } from '../../domain/sessoes/entities/SerieRegistrada';
import type { SerieRegistradaRepository } from '../../domain/sessoes/repositories/SerieRegistradaRepository';

export class InMemorySerieRegistradaRepository implements SerieRegistradaRepository {
  private readonly seriesById = new Map<string, SerieRegistrada>();

  async save(serie: SerieRegistrada): Promise<void> {
    this.seriesById.set(serie.toPrimitives().id, serie);
  }

  async findById(id: string): Promise<SerieRegistrada | null> {
    return this.seriesById.get(id) ?? null;
  }

  async listBySessaoExercicioId(sessaoExercicioId: string): Promise<SerieRegistrada[]> {
    return Array.from(this.seriesById.values())
      .filter((s) => s.toPrimitives().sessaoExercicioId === sessaoExercicioId)
      .sort((a, b) => a.toPrimitives().ordem - b.toPrimitives().ordem);
  }

  async countBySessaoExercicioId(sessaoExercicioId: string): Promise<number> {
    let count = 0;
    for (const s of this.seriesById.values()) {
      if (s.toPrimitives().sessaoExercicioId === sessaoExercicioId) count++;
    }
    return count;
  }

  async delete(id: string): Promise<void> {
    this.seriesById.delete(id);
  }
}
