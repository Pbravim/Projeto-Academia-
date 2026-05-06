import type { SessaoTreino } from '../entities/SessaoTreino';

export interface SessaoTreinoRepository {
  save(sessao: SessaoTreino): Promise<void>;
  findById(id: string): Promise<SessaoTreino | null>;
  findAtiva(): Promise<SessaoTreino | null>;
  delete(id: string): Promise<void>;
}
