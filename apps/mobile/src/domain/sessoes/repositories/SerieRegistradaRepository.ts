import type { SerieRegistrada } from '../entities/SerieRegistrada';

export interface SerieRegistradaRepository {
  save(serie: SerieRegistrada): Promise<void>;
  findById(id: string): Promise<SerieRegistrada | null>;
  listBySessaoExercicioId(sessaoExercicioId: string): Promise<SerieRegistrada[]>;
  countBySessaoExercicioId(sessaoExercicioId: string): Promise<number>;
  delete(id: string): Promise<void>;
}
