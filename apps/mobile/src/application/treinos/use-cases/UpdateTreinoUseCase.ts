import { Treino, type TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import type { TreinoRepository } from '../../../domain/treinos/repositories/TreinoRepository';
import { TreinoNotFoundError } from '../errors/TreinoNotFoundError';

export interface UpdateTreinoInput {
  id: string;
  name: string;
  objetivo?: string | null;
}

interface UpdateTreinoUseCaseDependencies {
  treinoRepository: TreinoRepository;
  now: () => Date;
}

/** Atualiza o nome e o objetivo de um treino template existente. */
export class UpdateTreinoUseCase {
  constructor(private readonly dependencies: UpdateTreinoUseCaseDependencies) {}

  /**
   * @throws {TreinoNotFoundError} treino nao encontrado
   * @throws {TreinoValidationError} nome inválido ou vazio
   */
  async execute(input: UpdateTreinoInput): Promise<TreinoPrimitives> {
    const current = await this.dependencies.treinoRepository.findById(input.id);
    if (!current) throw new TreinoNotFoundError(input.id);

    const updated = Treino.update(current.toPrimitives(), input, this.dependencies.now());
    await this.dependencies.treinoRepository.save(updated);

    return updated.toPrimitives();
  }
}
