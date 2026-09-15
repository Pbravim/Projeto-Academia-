import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { SessaoValidationError } from '../../../domain/sessoes/errors/SessaoValidationError';
import type { SerieRegistradaRepository } from '../../../domain/sessoes/repositories/SerieRegistradaRepository';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import type { TransactionPort } from '../../../domain/shared/ports/TransactionPort';
import { Treino, type TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import { TreinoExercicio } from '../../../domain/treinos/entities/TreinoExercicio';
import type { TreinoExercicioRepository } from '../../../domain/treinos/repositories/TreinoExercicioRepository';
import type { TreinoRepository } from '../../../domain/treinos/repositories/TreinoRepository';
import { DuplicateTreinoError } from '../../treinos/errors/DuplicateTreinoError';
import { SessaoNotFoundError } from '../errors/SessaoNotFoundError';

import { templateFromSessao } from './templateFromSessao';

export interface SalvarSessaoComoTreinoInput {
  sessaoId: string;
  nome: string;
}

interface SalvarSessaoComoTreinoUseCaseDependencies {
  sessaoTreinoRepository: SessaoTreinoRepository;
  sessaoExercicioRepository: SessaoExercicioRepository;
  serieRegistradaRepository: SerieRegistradaRepository;
  treinoRepository: TreinoRepository;
  treinoExercicioRepository: TreinoExercicioRepository;
  idGenerator: () => string;
  now: () => Date;
  database?: TransactionPort;
}

/**
 * Cria um novo Treino a partir dos exercicios e series de uma sessao (livre ou de
 * treino), sem carga (D3). Nao religa a sessao ao treino criado — so atualiza o
 * snapshot do nome (D2), porque religar divergiria servidor x device.
 */
export class SalvarSessaoComoTreinoUseCase {
  constructor(private readonly dependencies: SalvarSessaoComoTreinoUseCaseDependencies) {}

  /**
   * @throws {SessaoNotFoundError} sessao nao encontrada
   * @throws {SessaoValidationError} sessao cancelada ou nome invalido
   * @throws {DuplicateTreinoError} ja existe treino com o mesmo nome
   */
  async execute(input: SalvarSessaoComoTreinoInput): Promise<TreinoPrimitives> {
    const sessao = await this.dependencies.sessaoTreinoRepository.findById(input.sessaoId);
    if (!sessao) throw new SessaoNotFoundError(input.sessaoId);

    const sessaoPrimitives = sessao.toPrimitives();
    if (sessaoPrimitives.status === 'cancelada') {
      throw new SessaoValidationError('Sessao cancelada nao pode virar treino.');
    }

    const nomeNormalizado = input.nome.trim().replace(/\s+/g, ' ');
    if (nomeNormalizado.length < 2) {
      throw new SessaoValidationError('Nome precisa ter pelo menos 2 caracteres.');
    }

    // Comparacao inline (3 linhas) em vez de compor CreateTreinoUseCase: evita
    // arrastar seu contrato de erro/id so para checar duplicata de nome.
    const treinosExistentes = await this.dependencies.treinoRepository.list();
    const nomeNormalizadoLower = nomeNormalizado.toLowerCase();
    if (treinosExistentes.some((t) => t.toPrimitives().name.trim().toLowerCase() === nomeNormalizadoLower)) {
      throw new DuplicateTreinoError(nomeNormalizado);
    }

    const salvar = async (): Promise<TreinoPrimitives> => {
      const treino = Treino.create({
        id: this.dependencies.idGenerator(),
        name: nomeNormalizado,
        createdAt: this.dependencies.now(),
      });
      await this.dependencies.treinoRepository.save(treino);
      const treinoPrimitives = treino.toPrimitives();

      const sessaoExercicios = await this.dependencies.sessaoExercicioRepository.listBySessaoId(input.sessaoId);

      // TreinoExercicio tem UNIQUE(treino_id, exercicio_id): substituicao pode
      // deixar o mesmo exercicioId duas vezes na sessao. Dedupe ANTES de
      // escrever — o SQLite faz INSERT OR REPLACE, que apagaria a 1a linha em
      // silencio se a gente nao filtrasse antes (ver LEARNINGS "InMemory sem UNIQUE").
      const exercicioIdsVistos = new Set<string>();
      const sessaoExerciciosSemDuplicata = sessaoExercicios.filter((se) => {
        const { exercicioId } = se.toPrimitives();
        if (exercicioIdsVistos.has(exercicioId)) return false;
        exercicioIdsVistos.add(exercicioId);
        return true;
      });

      const series = await this.dependencies.serieRegistradaRepository.listBySessaoExercicioIds(
        sessaoExerciciosSemDuplicata.map((se) => se.toPrimitives().id)
      );
      const seriesPorSessaoExercicioId = new Map<string, typeof series>();
      for (const serie of series) {
        const { sessaoExercicioId } = serie.toPrimitives();
        const lista = seriesPorSessaoExercicioId.get(sessaoExercicioId) ?? [];
        lista.push(serie);
        seriesPorSessaoExercicioId.set(sessaoExercicioId, lista);
      }

      let ordem = 1;
      for (const se of sessaoExerciciosSemDuplicata) {
        const p = se.toPrimitives();
        const seriesDoSe = (seriesPorSessaoExercicioId.get(p.id) ?? []).map((serie) => serie.toPrimitives());
        const template = templateFromSessao(p, seriesDoSe);

        const treinoExercicio = TreinoExercicio.create({
          id: this.dependencies.idGenerator(),
          treinoId: treinoPrimitives.id,
          exercicioId: p.exercicioId,
          ordem: ordem++,
          ...template,
        });
        await this.dependencies.treinoExercicioRepository.save(treinoExercicio);
      }

      if (sessaoPrimitives.treinoNomeSnapshot !== nomeNormalizado) {
        await this.dependencies.sessaoTreinoRepository.save(
          SessaoTreino.restore({ ...sessaoPrimitives, treinoNomeSnapshot: nomeNormalizado })
        );
      }

      return treinoPrimitives;
    };

    if (this.dependencies.database) {
      return this.dependencies.database.withTransaction(salvar);
    }
    return salvar();
  }
}
