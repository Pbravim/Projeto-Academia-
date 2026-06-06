import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import type { SerieRegistradaRepository } from '../../../domain/sessoes/repositories/SerieRegistradaRepository';
import type { SubstituicaoMotivo } from '../../../domain/sessoes/entities/SessaoExercicio';
import { ExerciseNotFoundError } from '../../exercises/errors/ExerciseNotFoundError';
import { SessaoEncerradaError } from '../errors/SessaoEncerradaError';
import { SessaoExercicioNotFoundError } from '../errors/SessaoExercicioNotFoundError';
import { SessaoValidationError } from '../../../domain/sessoes/errors/SessaoValidationError';

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

    // Delete series recorded for the original exercise before saving the substitution
    await this.deps.serieRegistradaRepository.deleteBySessaoExercicioId(input.sessaoExercicioId);

    const ex = novoExercicio.toPrimitives();
    const substituido = sessaoExercicio.withSubstituicao(
      ex.id,
      ex.name,
      ex.groupMuscle,
      ex.category,
      ex.equipment,
      ex.musculoAlvo.length > 0 ? JSON.stringify(ex.musculoAlvo) : null,
      input.motivo,
    );

    await this.deps.sessaoExercicioRepository.save(substituido);
  }
}
