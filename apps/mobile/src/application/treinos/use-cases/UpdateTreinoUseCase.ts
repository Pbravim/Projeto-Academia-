import { Treino, type TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import type { TreinoRepository } from '../../../domain/treinos/repositories/TreinoRepository';
import { DuplicateTreinoError } from '../errors/DuplicateTreinoError';
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
   * @throws {DuplicateTreinoError} novo nome já pertence a outro treino
   */
  async execute(input: UpdateTreinoInput): Promise<TreinoPrimitives> {
    const current = await this.dependencies.treinoRepository.findById(input.id);
    if (!current) throw new TreinoNotFoundError(input.id);

    const updated = Treino.update(current.toPrimitives(), input, this.dependencies.now());
    const updatedNorm = updated.toPrimitives().name.trim().toLowerCase();
    const currentNorm = current.toPrimitives().name.trim().toLowerCase();

    if (updatedNorm !== currentNorm) {
      const allTreinos = await this.dependencies.treinoRepository.list();
      if (allTreinos.some((t) => t.toPrimitives().name.trim().toLowerCase() === updatedNorm && t.toPrimitives().id !== input.id)) {
        throw new DuplicateTreinoError(updated.toPrimitives().name);
      }
    }

    await this.dependencies.treinoRepository.save(updated);
    return updated.toPrimitives();
  }
}
