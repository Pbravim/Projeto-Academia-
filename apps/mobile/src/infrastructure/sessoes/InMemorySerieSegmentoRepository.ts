import { SerieSegmento } from '../../domain/sessoes/entities/SerieSegmento';
import type { SerieSegmentoRepository } from '../../domain/sessoes/repositories/SerieSegmentoRepository';

export class InMemorySerieSegmentoRepository implements SerieSegmentoRepository {
  private readonly segmentosById = new Map<string, SerieSegmento>();

  async save(segmento: SerieSegmento): Promise<void> {
    this.segmentosById.set(segmento.toPrimitives().id, segmento);
  }

  async findById(id: string): Promise<SerieSegmento | null> {
    return this.segmentosById.get(id) ?? null;
  }

  async listBySerieId(serieId: string): Promise<SerieSegmento[]> {
    return Array.from(this.segmentosById.values())
      .filter((s) => s.toPrimitives().serieId === serieId)
      .sort((a, b) => a.toPrimitives().ordem - b.toPrimitives().ordem);
  }

  async listBySerieIds(serieIds: string[]): Promise<SerieSegmento[]> {
    if (serieIds.length === 0) return [];
    const idSet = new Set(serieIds);
    return Array.from(this.segmentosById.values())
      .filter((s) => idSet.has(s.toPrimitives().serieId))
      .sort((a, b) => a.toPrimitives().ordem - b.toPrimitives().ordem);
  }

  async maxOrdemBySerieId(serieId: string): Promise<number> {
    let max = 1;
    for (const s of this.segmentosById.values()) {
      const p = s.toPrimitives();
      if (p.serieId === serieId && p.ordem > max) max = p.ordem;
    }
    return max;
  }

  async delete(id: string): Promise<void> {
    this.segmentosById.delete(id);
  }

  async deleteBySerieIds(serieIds: string[]): Promise<void> {
    const idSet = new Set(serieIds);
    for (const [id, segmento] of this.segmentosById.entries()) {
      if (idSet.has(segmento.toPrimitives().serieId)) this.segmentosById.delete(id);
    }
  }
}
