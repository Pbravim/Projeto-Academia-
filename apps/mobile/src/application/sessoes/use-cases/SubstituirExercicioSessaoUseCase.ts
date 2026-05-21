import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import type { SubstituicaoMotivo } from '../../../domain/sessoes/entities/SessaoExercicio';
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

    const ex = novoExercicio.toPrimitives();
    const substituido = sessaoExercicio.withSubstituicao(
      ex.id,
      ex.name,
      ex.groupMuscle,
      ex.category,
      ex.equipment,
      ex.musculoAlvo,
      input.motivo,
    );

    await this.deps.sessaoExercicioRepository.save(substituido);
  }
}
