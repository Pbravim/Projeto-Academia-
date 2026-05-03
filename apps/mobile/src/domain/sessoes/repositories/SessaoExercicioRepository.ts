import type { SessaoExercicio } from '../entities/SessaoExercicio';

export interface SessaoExercicioRepository {
  save(sessaoExercicio: SessaoExercicio): Promise<void>;
  findById(id: string): Promise<SessaoExercicio | null>;
  findBySessaoIdAndExercicioId(sessaoId: string, exercicioId: string): Promise<SessaoExercicio | null>;
  listBySessaoId(sessaoId: string): Promise<SessaoExercicio[]>;
  countBySessaoId(sessaoId: string): Promise<number>;
}
