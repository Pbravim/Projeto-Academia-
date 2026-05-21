import type { RegistroPesoPrimitives } from '../../../domain/peso/entities/RegistroPeso';
import type { RegistroPesoRepository } from '../../../domain/peso/repositories/RegistroPesoRepository';

/** Lista todos os registros de peso corporal ordenados do mais recente para o mais antigo. */
export class ListRegistrosPesoUseCase {
  constructor(private readonly repository: RegistroPesoRepository) {}

  async execute(): Promise<RegistroPesoPrimitives[]> {
    const registros = await this.repository.list();
    return registros.map((r) => r.toPrimitives());
  }
}
