import { Treino, type TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import type { TreinoRepository } from '../../../domain/treinos/repositories/TreinoRepository';

export interface CreateTreinoInput {
  name: string;
  objetivo?: string;
}

interface CreateTreinoUseCaseDependencies {
  treinoRepository: TreinoRepository;
  idGenerator: () => string;
  now: () => Date;
}

/** Cria um novo treino template. O treino criado nao tem exercicios — use AddExercicioAoTreinoUseCase para adicioná-los. */
export class CreateTreinoUseCase {
  constructor(private readonly dependencies: CreateTreinoUseCaseDependencies) {}

  /** @throws {TreinoValidationError} nome inválido ou vazio */
  async execute(input: CreateTreinoInput): Promise<TreinoPrimitives> {
    const treino = Treino.create({
      id: this.dependencies.idGenerator(),
      name: input.name,
      objetivo: input.objetivo,
      createdAt: this.dependencies.now(),
    });

    await this.dependencies.treinoRepository.save(treino);

    return treino.toPrimitives();
  }
}
