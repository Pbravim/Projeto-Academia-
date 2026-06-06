import { SessaoExercicio, type SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';
import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import type { SQLiteDatabaseClient } from '../../../infrastructure/persistence/sqlite/SQLiteDatabaseClient';
import { ExerciseNotFoundError } from '../../exercises/errors/ExerciseNotFoundError';
import { ExercicioJaNaSessaoError } from '../errors/ExercicioJaNaSessaoError';
import { SessaoEncerradaError } from '../errors/SessaoEncerradaError';
import { SessaoNotFoundError } from '../errors/SessaoNotFoundError';

export interface AddExercicioASessaoInput {
  sessaoId: string;
  exercicioId: string;
}

interface AddExercicioASessaoUseCaseDependencies {
  sessaoTreinoRepository: SessaoTreinoRepository;
  sessaoExercicioRepository: SessaoExercicioRepository;
  exerciseRepository: ExerciseRepository;
  idGenerator: () => string;
  database?: SQLiteDatabaseClient;
}

/**
 * Adiciona um exercicio extra a uma sessao ativa.
 * Cria um snapshot do exercicio no momento da adicao. Util para incluir exercicios fora do plano original.
 */
export class AddExercicioASessaoUseCase {
  constructor(private readonly dependencies: AddExercicioASessaoUseCaseDependencies) {}

  /**
   * @throws {SessaoNotFoundError} sessao nao encontrada
   * @throws {SessaoEncerradaError} sessao ja foi finalizada
   * @throws {ExerciseNotFoundError} exercicio nao encontrado no catalogo
   * @throws {ExercicioJaNaSessaoError} exercicio ja esta na sessao
   */
  async execute(input: AddExercicioASessaoInput): Promise<SessaoExercicioPrimitives> {
    const sessao = await this.dependencies.sessaoTreinoRepository.findById(input.sessaoId);
    if (!sessao) throw new SessaoNotFoundError(input.sessaoId);
    if (!sessao.isAtiva()) throw new SessaoEncerradaError();

    const exercise = await this.dependencies.exerciseRepository.findById(input.exercicioId);
    if (!exercise) throw new ExerciseNotFoundError(input.exercicioId);

    const existing = await this.dependencies.sessaoExercicioRepository.findBySessaoIdAndExercicioId(
      input.sessaoId,
      input.exercicioId
    );
    if (existing) throw new ExercicioJaNaSessaoError(input.exercicioId);

    const ex = exercise.toPrimitives();
    let sessaoExercicio!: SessaoExercicio;

    const saveNew = async () => {
      const count = await this.dependencies.sessaoExercicioRepository.countBySessaoId(input.sessaoId);
      sessaoExercicio = SessaoExercicio.create({
        id: this.dependencies.idGenerator(),
        sessaoTreinoId: input.sessaoId,
        exercicioId: input.exercicioId,
        ordem: count + 1,
        nomeSnapshot: ex.name,
        grupoMuscularSnapshot: ex.groupMuscle,
        categoriaSnapshot: ex.category,
        equipamentoSnapshot: ex.equipment,
        musculoAlvoSnapshot: ex.musculoAlvo.length > 0 ? JSON.stringify(ex.musculoAlvo) : null,
        realizado: false,
        seriesRecomendadas: null,
        execucoesRecomendadas: null,
        cargaPadrao: null,
        tempoDescansoSegundos: null,
        metodo: 'normal',
        grupoId: null,
        substituidoPorExercicioId: null,
        substituicaoMotivo: null,
        nomeOriginalSnapshot: null,
      });
      await this.dependencies.sessaoExercicioRepository.save(sessaoExercicio);
    };

    if (this.dependencies.database) {
      await this.dependencies.database.withTransaction(saveNew);
    } else {
      await saveNew();
    }

    return sessaoExercicio.toPrimitives();
  }
}
