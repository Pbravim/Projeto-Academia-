import type { SerieRegistradaRepository } from '../../../domain/sessoes/repositories/SerieRegistradaRepository';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import type { TransactionPort } from '../../../domain/shared/ports/TransactionPort';
import { TreinoExercicio, type TreinoExercicioPrimitives } from '../../../domain/treinos/entities/TreinoExercicio';
import type { TreinoExercicioRepository } from '../../../domain/treinos/repositories/TreinoExercicioRepository';
import type { TreinoRepository } from '../../../domain/treinos/repositories/TreinoRepository';
import { ExerciseNotFoundError } from '../../exercises/errors/ExerciseNotFoundError';
import { TreinoNotFoundError } from '../../treinos/errors/TreinoNotFoundError';
import { SessaoNotFoundError } from '../errors/SessaoNotFoundError';
import { SessaoSemTreinoError } from '../errors/SessaoSemTreinoError';

import { templateFromSessao } from './templateFromSessao';

export interface AdicionarExerciciosAoTreinoInput {
  sessaoId: string;
  exercicioIds: string[];
}

interface AdicionarExerciciosAoTreinoUseCaseDependencies {
  sessaoTreinoRepository: SessaoTreinoRepository;
  sessaoExercicioRepository: SessaoExercicioRepository;
  serieRegistradaRepository: SerieRegistradaRepository;
  treinoRepository: TreinoRepository;
  treinoExercicioRepository: TreinoExercicioRepository;
  idGenerator: () => string;
  database?: TransactionPort;
}

/**
 * Adiciona ao template do treino os exercicios avulsos que o aluno escolheu em lote,
 * apos a sessao ja finalizada (D6/D7). Exercicio ja presente no treino e pulado
 * (idempotente — permite re-clique da UI).
 */
export class AdicionarExerciciosAoTreinoUseCase {
  constructor(private readonly dependencies: AdicionarExerciciosAoTreinoUseCaseDependencies) {}

  /**
   * @throws {SessaoNotFoundError} sessao nao encontrada
   * @throws {SessaoSemTreinoError} sessao e livre (nao tem treino para adicionar)
   * @throws {TreinoNotFoundError} treino nao encontrado
   * @throws {ExerciseNotFoundError} exercicioId nao pertence a sessao
   */
  async execute(input: AdicionarExerciciosAoTreinoInput): Promise<TreinoExercicioPrimitives[]> {
    const sessao = await this.dependencies.sessaoTreinoRepository.findById(input.sessaoId);
    if (!sessao) throw new SessaoNotFoundError(input.sessaoId);

    const { treinoId } = sessao.toPrimitives();
    if (treinoId === null) throw new SessaoSemTreinoError();

    const treino = await this.dependencies.treinoRepository.findById(treinoId);
    if (!treino) throw new TreinoNotFoundError(treinoId);

    const sessaoExercicios = await this.dependencies.sessaoExercicioRepository.listBySessaoId(input.sessaoId);
    // Mantem a 1a ocorrencia por exercicioId (alinhado ao dedupe do SalvarSessaoComoTreinoUseCase):
    // um `new Map(...)` direto ficaria com a ULTIMA, invertendo a politica entre os dois use cases irmaos.
    const sessaoExercicioPorExercicioId = new Map<string, (typeof sessaoExercicios)[number]>();
    for (const se of sessaoExercicios) {
      const { exercicioId } = se.toPrimitives();
      if (!sessaoExercicioPorExercicioId.has(exercicioId)) sessaoExercicioPorExercicioId.set(exercicioId, se);
    }

    for (const exercicioId of input.exercicioIds) {
      if (!sessaoExercicioPorExercicioId.has(exercicioId)) throw new ExerciseNotFoundError(exercicioId);
    }

    const criados: TreinoExercicioPrimitives[] = [];

    const adicionar = async () => {
      for (const exercicioId of input.exercicioIds) {
        const jaNoTreino = await this.dependencies.treinoExercicioRepository.findByTreinoIdAndExercicioId(
          treinoId,
          exercicioId
        );
        if (jaNoTreino) continue;

        const se = sessaoExercicioPorExercicioId.get(exercicioId)!;
        const seriesDoSe = (
          await this.dependencies.serieRegistradaRepository.listBySessaoExercicioId(se.toPrimitives().id)
        ).map((serie) => serie.toPrimitives());
        const template = templateFromSessao(se.toPrimitives(), seriesDoSe);

        // MAX(ordem)+1 recalculado a cada iteracao: inclui os ja salvos neste lote.
        const maxOrdem = await this.dependencies.treinoExercicioRepository.maxOrdemByTreinoId(treinoId);
        // Reativa tombstone do mesmo par (treino, exercicio) — mesma regra do
        // AddExercicioAoTreinoUseCase: reusar o id evita estourar o UNIQUE e
        // preserva a deleção pendente de sync.
        const tombstonedId = await this.dependencies.treinoExercicioRepository.findTombstonedId(treinoId, exercicioId);

        const treinoExercicio = TreinoExercicio.create({
          id: tombstonedId ?? this.dependencies.idGenerator(),
          treinoId,
          exercicioId,
          ordem: maxOrdem + 1,
          ...template,
        });
        await this.dependencies.treinoExercicioRepository.save(treinoExercicio);
        criados.push(treinoExercicio.toPrimitives());
      }
    };

    if (this.dependencies.database) {
      await this.dependencies.database.withTransaction(adicionar);
    } else {
      await adicionar();
    }

    return criados;
  }
}

