import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';
import type { TransactionPort } from '../../../domain/shared/ports/TransactionPort';
import { TreinoExercicio, type TreinoExercicioPrimitives } from '../../../domain/treinos/entities/TreinoExercicio';
import type { TreinoExercicioRepository } from '../../../domain/treinos/repositories/TreinoExercicioRepository';
import type { TreinoRepository } from '../../../domain/treinos/repositories/TreinoRepository';
import { ExerciseNotFoundError } from '../../exercises/errors/ExerciseNotFoundError';
import { ExercicioJaNoTreinoError } from '../errors/ExercicioJaNoTreinoError';
import { TreinoNotFoundError } from '../errors/TreinoNotFoundError';

export interface AddExercicioAoTreinoInput {
  treinoId: string;
  exercicioId: string;
}

interface AddExercicioAoTreinoUseCaseDependencies {
  treinoRepository: TreinoRepository;
  treinoExercicioRepository: TreinoExercicioRepository;
  exerciseRepository: ExerciseRepository;
  idGenerator: () => string;
  database?: TransactionPort;
}

/** Adiciona um exercicio ao treino template. A ordem e atribuida automaticamente ao final da lista. */
export class AddExercicioAoTreinoUseCase {
  constructor(private readonly dependencies: AddExercicioAoTreinoUseCaseDependencies) {}

  /**
   * @throws {TreinoNotFoundError} treino nao encontrado
   * @throws {ExerciseNotFoundError} exercicio nao encontrado
   * @throws {ExercicioJaNoTreinoError} exercicio ja esta no treino
   */
  async execute(input: AddExercicioAoTreinoInput): Promise<TreinoExercicioPrimitives> {
    const treino = await this.dependencies.treinoRepository.findById(input.treinoId);
    if (!treino) throw new TreinoNotFoundError(input.treinoId);

    const exercise = await this.dependencies.exerciseRepository.findById(input.exercicioId);
    if (!exercise) throw new ExerciseNotFoundError(input.exercicioId);

    const existing = await this.dependencies.treinoExercicioRepository.findByTreinoIdAndExercicioId(
      input.treinoId,
      input.exercicioId
    );
    if (existing) throw new ExercicioJaNoTreinoError(input.exercicioId);

    let treinoExercicio!: TreinoExercicio;

    const saveNew = async () => {
      // MAX(ordem)+1 incluindo soft-deletadas: count+1 colide após remover do meio.
      const maxOrdem = await this.dependencies.treinoExercicioRepository.maxOrdemByTreinoId(input.treinoId);
      // Se existe tombstone do mesmo par (removido e re-adicionado), reutiliza o id:
      // inserir um id novo estouraria o UNIQUE(treino_id, exercicio_id) e o REPLACE
      // destruiria o tombstone antes do push (a deleção nunca chegaria ao servidor).
      const tombstonedId = await this.dependencies.treinoExercicioRepository.findTombstonedId(
        input.treinoId,
        input.exercicioId
      );
      treinoExercicio = TreinoExercicio.create({
        id: tombstonedId ?? this.dependencies.idGenerator(),
        treinoId: input.treinoId,
        exercicioId: input.exercicioId,
        ordem: maxOrdem + 1,
        seriesRecomendadas: null,
        execucoesRecomendadas: null,
        cargaPadrao: null,
        tempoDescansoSegundos: null,
        metodo: 'normal',
        grupoId: null,
        duracaoRecomendadaSegundos: null,
        distanciaRecomendadaMetros: null,
        intensidadeRecomendada: null,
      });
      await this.dependencies.treinoExercicioRepository.save(treinoExercicio);
    };

    if (this.dependencies.database) {
      await this.dependencies.database.withTransaction(saveNew);
    } else {
      await saveNew();
    }

    return treinoExercicio.toPrimitives();
  }
}
