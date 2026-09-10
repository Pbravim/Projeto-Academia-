import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';
import type { SubstituicaoMotivo } from '../../../domain/sessoes/entities/SessaoExercicio';
import { SessaoValidationError } from '../../../domain/sessoes/errors/SessaoValidationError';
import type { SerieRegistradaRepository } from '../../../domain/sessoes/repositories/SerieRegistradaRepository';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import type { TransactionPort } from '../../../domain/shared/ports/TransactionPort';
import { ExerciseNotFoundError } from '../../exercises/errors/ExerciseNotFoundError';
import { SessaoEncerradaError } from '../errors/SessaoEncerradaError';
import { SessaoExercicioNotFoundError } from '../errors/SessaoExercicioNotFoundError';

export interface SubstituirExercicioInput {
  sessaoExercicioId: string;
  novoExercicioId: string;
  motivo: SubstituicaoMotivo | null;
}

interface Dependencies {
  sessaoTreinoRepository: SessaoTreinoRepository;
  sessaoExercicioRepository: SessaoExercicioRepository;
  exerciseRepository: ExerciseRepository;
  serieRegistradaRepository: SerieRegistradaRepository;
  database?: TransactionPort;
}

export class DuplicateExercicioInSessaoError extends Error {
  constructor(exercicioId: string) {
    super(`Exercicio ${exercicioId} ja esta presente nesta sessao.`);
    this.name = 'DuplicateExercicioInSessaoError';
  }
}

export class SubstituirExercicioSessaoUseCase {
  constructor(private readonly deps: Dependencies) {}

  async execute(input: SubstituirExercicioInput): Promise<void> {
    const sessaoExercicio = await this.deps.sessaoExercicioRepository.findById(input.sessaoExercicioId);
    if (!sessaoExercicio) throw new SessaoExercicioNotFoundError(input.sessaoExercicioId);

    const sessao = await this.deps.sessaoTreinoRepository.findById(sessaoExercicio.toPrimitives().sessaoTreinoId);
    if (!sessao || !sessao.isAtiva()) throw new SessaoEncerradaError();

    const novoExercicio = await this.deps.exerciseRepository.findById(input.novoExercicioId);
    if (!novoExercicio) throw new ExerciseNotFoundError(input.novoExercicioId);

    // Check if the new exercise is already present in the session (duplicate guard)
    const sessaoId = sessaoExercicio.toPrimitives().sessaoTreinoId;
    const existing = await this.deps.sessaoExercicioRepository.findBySessaoIdAndExercicioId(
      sessaoId,
      input.novoExercicioId
    );
    if (existing) throw new DuplicateExercicioInSessaoError(input.novoExercicioId);

    const ex = novoExercicio.toPrimitives();
    const substituido = sessaoExercicio.withSubstituicao(
      ex.id,
      ex.name,
      ex.groupMuscles.join(', '),
      ex.category,
      ex.equipment,
      ex.musculoAlvo,
      ex.movementPattern,
      input.motivo,
    );

    // Transação: sem ela, morrer entre o delete e o save deixava as séries
    // apagadas sem a substituição gravada.
    const apply = async () => {
      await this.deps.serieRegistradaRepository.deleteBySessaoExercicioId(input.sessaoExercicioId);
      await this.deps.sessaoExercicioRepository.save(substituido);
    };
    if (this.deps.database) {
      await this.deps.database.withTransaction(apply);
    } else {
      await apply();
    }
  }
}
