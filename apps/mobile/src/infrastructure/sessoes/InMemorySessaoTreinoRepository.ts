import { SessaoTreino } from '../../domain/sessoes/entities/SessaoTreino';
import type { SessaoTreinoRepository } from '../../domain/sessoes/repositories/SessaoTreinoRepository';

export class InMemorySessaoTreinoRepository implements SessaoTreinoRepository {
  private readonly sessoesById = new Map<string, SessaoTreino>();

  async save(sessao: SessaoTreino): Promise<void> {
    this.sessoesById.set(sessao.toPrimitives().id, sessao);
  }

  async findById(id: string): Promise<SessaoTreino | null> {
    return this.sessoesById.get(id) ?? null;
  }

  async findAtiva(): Promise<SessaoTreino | null> {
    for (const sessao of this.sessoesById.values()) {
      if (sessao.isAtiva()) return sessao;
    }
    return null;
  }

  async delete(id: string): Promise<void> {
    this.sessoesById.delete(id);
  }

  async deleteByTreinoId(treinoId: string): Promise<void> {
    for (const [id, sessao] of this.sessoesById) {
      if (sessao.toPrimitives().treinoId === treinoId) this.sessoesById.delete(id);
    }
  }
}
