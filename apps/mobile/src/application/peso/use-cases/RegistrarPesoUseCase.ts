import { RegistroPeso, type RegistroPesoPrimitives } from '../../../domain/peso/entities/RegistroPeso';
import type { RegistroPesoRepository } from '../../../domain/peso/repositories/RegistroPesoRepository';

export interface RegistrarPesoInput {
  pesoKg: number;
  observacao?: string;
}

interface RegistrarPesoUseCaseDependencies {
  registroPesoRepository: RegistroPesoRepository;
  idGenerator: () => string;
  now: () => Date;
}

/** Registra o peso corporal do usuario no momento atual. */
export class RegistrarPesoUseCase {
  constructor(private readonly dependencies: RegistrarPesoUseCaseDependencies) {}

  /** @throws {PesoValidationError} pesoKg nao e positivo ou e NaN */
  async execute(input: RegistrarPesoInput): Promise<RegistroPesoPrimitives> {
    const registro = RegistroPeso.create({
      id: this.dependencies.idGenerator(),
      pesoKg: input.pesoKg,
      dataRegistro: this.dependencies.now(),
      observacao: input.observacao,
    });

    await this.dependencies.registroPesoRepository.save(registro);

    return registro.toPrimitives();
  }
}
