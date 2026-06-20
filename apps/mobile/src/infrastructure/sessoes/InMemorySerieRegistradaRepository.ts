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

  async listBySessaoExercicioIds(ids: string[]): Promise<SerieRegistrada[]> {
    if (ids.length === 0) return [];
    const idSet = new Set(ids);
    return Array.from(this.seriesById.values())
      .filter((s) => idSet.has(s.toPrimitives().sessaoExercicioId))
      .sort((a, b) => a.toPrimitives().ordem - b.toPrimitives().ordem);
  }

  async countBySessaoExercicioId(sessaoExercicioId: string): Promise<number> {
    let count = 0;
    for (const s of this.seriesById.values()) {
      if (s.toPrimitives().sessaoExercicioId === sessaoExercicioId) count++;
    }
    return count;
  }

  async maxOrdemBySessaoExercicioId(sessaoExercicioId: string): Promise<number> {
    let max = 0;
    for (const s of this.seriesById.values()) {
      const p = s.toPrimitives();
      if (p.sessaoExercicioId === sessaoExercicioId && p.ordem > max) max = p.ordem;
    }
    return max;
  }

  async delete(id: string): Promise<void> {
    this.seriesById.delete(id);
  }

  async deleteBySessaoExercicioId(sessaoExercicioId: string): Promise<void> {
    for (const [id, serie] of this.seriesById.entries()) {
      if (serie.toPrimitives().sessaoExercicioId === sessaoExercicioId) this.seriesById.delete(id);
    }
  }

  async deleteBySessaoExercicioIds(ids: string[]): Promise<void> {
    const idSet = new Set(ids);
    for (const [id, serie] of this.seriesById.entries()) {
      if (idSet.has(serie.toPrimitives().sessaoExercicioId)) this.seriesById.delete(id);
    }
  }

  async deleteByExercicioId(_exercicioId: string): Promise<void> {
    // In-memory: the caller (DeleteExerciseUseCase) handles series deletion
    // via deleteBySessaoExercicioId before calling deleteByExercicioId on the session repo.
    // This no-op satisfies the interface for test environments that don't wire the full cascade.
  }

  async update(id: string, patch: { cargaKg: number; repeticoes: number; observacao?: string | null }): Promise<void> {
    const serie = this.seriesById.get(id);
    if (!serie) return;
    const p = serie.toPrimitives();
    const updated = SerieRegistrada.create({
      id: p.id,
      sessaoExercicioId: p.sessaoExercicioId,
      tipoSerie: p.tipoSerie,
      ordem: p.ordem,
      cargaKg: patch.cargaKg,
      repeticoes: patch.repeticoes,
      observacao: patch.observacao ?? undefined,
    });
    this.seriesById.set(id, updated);
  }
}
