import type { RegistroPeso } from '../../domain/peso/entities/RegistroPeso';
import type { RegistroPesoRepository } from '../../domain/peso/repositories/RegistroPesoRepository';

export class InMemoryRegistroPesoRepository implements RegistroPesoRepository {
  private readonly registrosById = new Map<string, RegistroPeso>();

  async save(registro: RegistroPeso): Promise<void> {
    this.registrosById.set(registro.toPrimitives().id, registro);
  }

  async list(): Promise<RegistroPeso[]> {
    return Array.from(this.registrosById.values());
  }

  async findById(id: string): Promise<RegistroPeso | null> {
    return this.registrosById.get(id) ?? null;
  }

  async delete(id: string): Promise<void> {
    this.registrosById.delete(id);
  }
}
