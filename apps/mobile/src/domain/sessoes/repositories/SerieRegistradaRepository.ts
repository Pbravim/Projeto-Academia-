import type { SerieRegistrada } from '../entities/SerieRegistrada';

export interface SerieRegistradaRepository {
  save(serie: SerieRegistrada): Promise<void>;
  findById(id: string): Promise<SerieRegistrada | null>;
  listBySessaoExercicioId(sessaoExercicioId: string): Promise<SerieRegistrada[]>;
  countBySessaoExercicioId(sessaoExercicioId: string): Promise<number>;
  delete(id: string): Promise<void>;
  deleteBySessaoExercicioId(sessaoExercicioId: string): Promise<void>;
  deleteBySessaoExercicioIds(ids: string[]): Promise<void>;
  deleteByExercicioId(exercicioId: string): Promise<void>;
  update(id: string, patch: { cargaKg: number; repeticoes: number; observacao?: string | null }): Promise<void>;
}
