import type { SerieSegmento } from '../entities/SerieSegmento';

export interface SerieSegmentoRepository {
  save(segmento: SerieSegmento): Promise<void>;
  findById(id: string): Promise<SerieSegmento | null>;
  listBySerieId(serieId: string): Promise<SerieSegmento[]>;
  listBySerieIds(serieIds: string[]): Promise<SerieSegmento[]>;
  /**
   * Maior `ordem` ja usada nos degraus da serie (inclui soft-deletados, mesma razao de
   * `maxOrdemBySessaoExercicioId`), ou 1 se nao ha filhos — o degrau 1 e a propria serie-mae.
   */
  maxOrdemBySerieId(serieId: string): Promise<number>;
  delete(id: string): Promise<void>;
  deleteBySerieIds(serieIds: string[]): Promise<void>;
}
