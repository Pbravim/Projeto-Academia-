import type { SerieRegistrada } from '../entities/SerieRegistrada';

export interface SerieRegistradaRepository {
  save(serie: SerieRegistrada): Promise<void>;
  findById(id: string): Promise<SerieRegistrada | null>;
  listBySessaoExercicioId(sessaoExercicioId: string): Promise<SerieRegistrada[]>;
  listBySessaoExercicioIds(ids: string[]): Promise<SerieRegistrada[]>;
  countBySessaoExercicioId(sessaoExercicioId: string): Promise<number>;
  /**
   * Maior `ordem` ja usada no exercicio (inclui series soft-deletadas), ou 0 se nenhuma.
   * Usar `maxOrdem + 1` ao criar — `count + 1` colide quando uma serie do meio e deletada.
   */
  maxOrdemBySessaoExercicioId(sessaoExercicioId: string): Promise<number>;
  delete(id: string): Promise<void>;
  deleteBySessaoExercicioId(sessaoExercicioId: string): Promise<void>;
  deleteBySessaoExercicioIds(ids: string[]): Promise<void>;
  deleteByExercicioId(exercicioId: string): Promise<void>;
  /** Tombstona as series de TODAS as sessoes do treino (cascata do DeleteTreino). */
  deleteByTreinoId(treinoId: string): Promise<void>;
  update(id: string, patch: { cargaKg: number; repeticoes: number; observacao?: string | null }): Promise<void>;
}
