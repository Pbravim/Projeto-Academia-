import type { Treino } from '../entities/Treino';

export interface TreinoRepository {
  save(treino: Treino): Promise<void>;
  list(): Promise<Treino[]>;
  findById(id: string): Promise<Treino | null>;
  delete(id: string): Promise<void>;
}
