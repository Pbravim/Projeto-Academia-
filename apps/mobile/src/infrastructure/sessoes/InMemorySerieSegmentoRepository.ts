import { SerieSegmento } from '../../domain/sessoes/entities/SerieSegmento';
import type { SerieSegmentoRepository } from '../../domain/sessoes/repositories/SerieSegmentoRepository';

export class InMemorySerieSegmentoRepository implements SerieSegmentoRepository {
  private readonly segmentosById = new Map<string, SerieSegmento>();
  // Tombstone (nao remove do Map): maxOrdemBySerieId precisa contar apagados, mesmo
  // contrato da porta e do SQLite (achado #4 da revisao 1, c1-27a) — um delete fisico
  // faria `maxOrdem` esquecer o maior `ordem` ja usado e reaproveitar o numero.
  private readonly deletedIds = new Set<string>();

  async save(segmento: SerieSegmento): Promise<void> {
    this.segmentosById.set(segmento.toPrimitives().id, segmento);
    this.deletedIds.delete(segmento.toPrimitives().id);
  }

  async findById(id: string): Promise<SerieSegmento | null> {
    if (this.deletedIds.has(id)) return null;
    return this.segmentosById.get(id) ?? null;
  }

  async listBySerieId(serieId: string): Promise<SerieSegmento[]> {
    return Array.from(this.segmentosById.values())
      .filter((s) => s.toPrimitives().serieId === serieId && !this.deletedIds.has(s.toPrimitives().id))
      .sort((a, b) => a.toPrimitives().ordem - b.toPrimitives().ordem);
  }

  async listBySerieIds(serieIds: string[]): Promise<SerieSegmento[]> {
    if (serieIds.length === 0) return [];
    const idSet = new Set(serieIds);
    return Array.from(this.segmentosById.values())
      .filter((s) => idSet.has(s.toPrimitives().serieId) && !this.deletedIds.has(s.toPrimitives().id))
      .sort((a, b) => a.toPrimitives().ordem - b.toPrimitives().ordem);
  }

  /** Inclui os tombstonados (mesma razao de maxOrdemBySessaoExercicioId): o numero de ordem nunca e reutilizado. */
  async maxOrdemBySerieId(serieId: string): Promise<number> {
    let max = 1;
    for (const s of this.segmentosById.values()) {
      const p = s.toPrimitives();
      if (p.serieId === serieId && p.ordem > max) max = p.ordem;
    }
    return max;
  }

  async delete(id: string): Promise<void> {
    this.deletedIds.add(id);
  }

  async deleteBySerieIds(serieIds: string[]): Promise<void> {
    const idSet = new Set(serieIds);
    for (const segmento of this.segmentosById.values()) {
      const p = segmento.toPrimitives();
      if (idSet.has(p.serieId)) this.deletedIds.add(p.id);
    }
  }
}
