import { SessaoExercicio } from '../../../domain/sessoes/entities/SessaoExercicio';
import { SessaoTreino, type SessaoTreinoPrimitives } from '../../../domain/sessoes/entities/SessaoTreino';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';
import type { TreinoExercicioPrimitives } from '../../../domain/treinos/entities/TreinoExercicio';
import type { TreinoExercicioRepository } from '../../../domain/treinos/repositories/TreinoExercicioRepository';
import type { TreinoRepository } from '../../../domain/treinos/repositories/TreinoRepository';
import type { SQLiteDatabaseClient } from '../../../infrastructure/persistence/sqlite/SQLiteDatabaseClient';
import { ExerciseNotFoundError } from '../../exercises/errors/ExerciseNotFoundError';
import { TreinoNotFoundError } from '../../treinos/errors/TreinoNotFoundError';
import { SessaoJaAtivaError } from '../errors/SessaoJaAtivaError';
import { TreinoSemExerciciosError } from '../errors/TreinoSemExerciciosError';

interface IniciarSessaoUseCaseDependencies {
  sessaoTreinoRepository: SessaoTreinoRepository;
  sessaoExercicioRepository: SessaoExercicioRepository;
  treinoRepository: TreinoRepository;
  treinoExercicioRepository: TreinoExercicioRepository;
  exerciseRepository: ExerciseRepository;
  idGenerator: () => string;
  now: () => Date;
  database?: SQLiteDatabaseClient;
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
    // Fail fast: check for active session before any DB reads
    const sessaoAtiva = await this.dependencies.sessaoTreinoRepository.findAtiva();
    if (sessaoAtiva) throw new SessaoJaAtivaError();

    const treino = await this.dependencies.treinoRepository.findById(treinoId);
    if (!treino) throw new TreinoNotFoundError(treinoId);

    const treinoExercicios = await this.dependencies.treinoExercicioRepository.listByTreinoId(treinoId);
    if (treinoExercicios.length === 0) throw new TreinoSemExerciciosError();

    const sessao = SessaoTreino.create({
      id: this.dependencies.idGenerator(),
      treinoId,
      treinoNomeSnapshot: treino.toPrimitives().name,
      dataHoraInicio: this.dependencies.now(),
    });

    // Validate all exercises exist before writing anything to the DB.
    // If we saved the session first and then threw, we'd leave a zombie 'em_andamento' session
    // that blocks every subsequent start attempt.
    const exerciseSnapshots: Array<{ p: TreinoExercicioPrimitives; ex: ExercisePrimitives }> = [];
    for (const te of treinoExercicios) {
      const p = te.toPrimitives();
      const exercise = await this.dependencies.exerciseRepository.findById(p.exercicioId);
      if (!exercise) throw new ExerciseNotFoundError(p.exercicioId);
      exerciseSnapshots.push({ p, ex: exercise.toPrimitives() });
    }

    const saveAll = async () => {
      await this.dependencies.sessaoTreinoRepository.save(sessao);

      for (const { p, ex } of exerciseSnapshots) {
        const sessaoExercicio = SessaoExercicio.create({
          id: this.dependencies.idGenerator(),
          sessaoTreinoId: sessao.toPrimitives().id,
          exercicioId: p.exercicioId,
          ordem: p.ordem,
          nomeSnapshot: ex.name,
          grupoMuscularSnapshot: ex.groupMuscle,
          categoriaSnapshot: ex.category,
          equipamentoSnapshot: ex.equipment,
          musculoAlvoSnapshot: ex.musculoAlvo,
          realizado: false,
          seriesRecomendadas: p.seriesRecomendadas,
          execucoesRecomendadas: p.execucoesRecomendadas,
          cargaPadrao: p.cargaPadrao,
          tempoDescansoSegundos: p.tempoDescansoSegundos,
          metodo: p.metodo,
          grupoId: p.grupoId,
          substituidoPorExercicioId: null,
          substituicaoMotivo: null,
          nomeOriginalSnapshot: null,
        });
        await this.dependencies.sessaoExercicioRepository.save(sessaoExercicio);
      }
    };

    if (this.dependencies.database) {
      await this.dependencies.database.withTransaction(saveAll);
    } else {
      await saveAll();
    }

    return sessao.toPrimitives();
  }
}
