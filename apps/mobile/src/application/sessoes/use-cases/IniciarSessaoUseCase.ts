import { SessaoExercicio } from '../../../domain/sessoes/entities/SessaoExercicio';
import { SessaoTreino, type SessaoTreinoPrimitives } from '../../../domain/sessoes/entities/SessaoTreino';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';
import type { TreinoExercicioRepository } from '../../../domain/treinos/repositories/TreinoExercicioRepository';
import type { TreinoRepository } from '../../../domain/treinos/repositories/TreinoRepository';
import { ExerciseNotFoundError } from '../../exercises/errors/ExerciseNotFoundError';
import { TreinoNotFoundError } from '../../treinos/errors/TreinoNotFoundError';
import { SessaoJaAtivaError } from '../errors/SessaoJaAtivaError';

interface IniciarSessaoUseCaseDependencies {
  sessaoTreinoRepository: SessaoTreinoRepository;
  sessaoExercicioRepository: SessaoExercicioRepository;
  treinoRepository: TreinoRepository;
  treinoExercicioRepository: TreinoExercicioRepository;
  exerciseRepository: ExerciseRepository;
  idGenerator: () => string;
  now: () => Date;
}

/**
 * Inicia uma sessao de treino a partir de um treino template.
 * Cria snapshots imutáveis de todos os exercicios do treino no momento do inicio.
 * So pode existir uma sessao ativa por vez.
 */
export class IniciarSessaoUseCase {
  constructor(private readonly dependencies: IniciarSessaoUseCaseDependencies) {}

  /**
   * @throws {SessaoJaAtivaError} já existe uma sessao em andamento
   * @throws {TreinoNotFoundError} treino nao encontrado
   * @throws {ExerciseNotFoundError} exercicio referenciado no treino nao encontrado no catalogo
   */
  async execute(treinoId: string): Promise<SessaoTreinoPrimitives> {
    const sessaoAtiva = await this.dependencies.sessaoTreinoRepository.findAtiva();
    if (sessaoAtiva) throw new SessaoJaAtivaError();

    const treino = await this.dependencies.treinoRepository.findById(treinoId);
    if (!treino) throw new TreinoNotFoundError(treinoId);

    const treinoExercicios = await this.dependencies.treinoExercicioRepository.listByTreinoId(treinoId);

    const sessao = SessaoTreino.create({
      id: this.dependencies.idGenerator(),
      treinoId,
      treinoNomeSnapshot: treino.toPrimitives().name,
      dataHoraInicio: this.dependencies.now(),
    });

    await this.dependencies.sessaoTreinoRepository.save(sessao);

    for (const te of treinoExercicios) {
      const p = te.toPrimitives();
      const exercise = await this.dependencies.exerciseRepository.findById(p.exercicioId);
      if (!exercise) throw new ExerciseNotFoundError(p.exercicioId);

      const ex = exercise.toPrimitives();
      const sessaoExercicio = SessaoExercicio.create({
        id: this.dependencies.idGenerator(),
        sessaoTreinoId: sessao.toPrimitives().id,
        exercicioId: p.exercicioId,
        ordem: p.ordem,
        nomeSnapshot: ex.name,
        grupoMuscularSnapshot: ex.groupMuscle,
        categoriaSnapshot: ex.category,
        equipamentoSnapshot: ex.equipment,
        realizado: true,
      });

      await this.dependencies.sessaoExercicioRepository.save(sessaoExercicio);
    }

    return sessao.toPrimitives();
  }
}
