import type { RegistroPesoRepository } from '../../../domain/peso/repositories/RegistroPesoRepository';

/** Remove um registro de peso corporal. Operacao silenciosa — nao lanca erro se o ID nao existir. */
export class DeleteRegistroPesoUseCase {
  constructor(private readonly repository: RegistroPesoRepository) {}

  async execute(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
