import { SerieRegistrada, type SerieRegistradaPrimitives } from '../../../domain/sessoes/entities/SerieRegistrada';
import { SerieSegmento } from '../../../domain/sessoes/entities/SerieSegmento';
import { SessaoExercicio, type SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';
import type { SerieRegistradaRepository } from '../../../domain/sessoes/repositories/SerieRegistradaRepository';
import type { SerieSegmentoRepository } from '../../../domain/sessoes/repositories/SerieSegmentoRepository';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import type { TransactionPort } from '../../../domain/shared/ports/TransactionPort';
import type { TreinoExercicioRepository } from '../../../domain/treinos/repositories/TreinoExercicioRepository';
import { SessaoValidationError } from '../../../domain/sessoes/errors/SessaoValidationError';
import { SessaoEncerradaError } from '../errors/SessaoEncerradaError';
import { SessaoExercicioNotFoundError } from '../errors/SessaoExercicioNotFoundError';

export interface RegistrarSerieSegmentoInput {
  cargaKg: number;
  repeticoes: number;
  descansoSegundos?: number;
}

export interface RegistrarSerieInput {
  sessaoExercicioId: string;
  cargaKg?: number;
  repeticoes?: number;
  duracaoSegundos?: number;
  distanciaMetros?: number;
  intensidade?: number;
  tipoSerie?: 'valida' | 'aquecimento';
  observacao?: string;
  /** Degraus (drop set/rest-pause/piramide) criados junto com a serie-mae, ordem 2..n. */
  segmentos?: RegistrarSerieSegmentoInput[];
}

interface RegistrarSerieUseCaseDependencies {
  sessaoTreinoRepository: SessaoTreinoRepository;
  sessaoExercicioRepository: SessaoExercicioRepository;
  serieRegistradaRepository: SerieRegistradaRepository;
  serieSegmentoRepository: SerieSegmentoRepository;
  treinoExercicioRepository: TreinoExercicioRepository;
  idGenerator: () => string;
  database?: TransactionPort;
}

/** Registra uma serie em um exercicio da sessao ativa. */
export class RegistrarSerieUseCase {
  constructor(private readonly dependencies: RegistrarSerieUseCaseDependencies) {}

  /**
   * A ordem da serie e atribuida automaticamente (maior ordem ja usada + 1, dentro do sessaoExercicio).
   * @throws {SessaoExercicioNotFoundError} exercicio da sessao nao encontrado
   * @throws {SessaoEncerradaError} sessao pai ja foi finalizada
   * @throws {SerieValidationError} cargaKg < 0 ou repeticoes < 1
   */
  async execute(input: RegistrarSerieInput): Promise<SerieRegistradaPrimitives> {
    const sessaoExercicio = await this.dependencies.sessaoExercicioRepository.findById(
      input.sessaoExercicioId
    );
    if (!sessaoExercicio) throw new SessaoExercicioNotFoundError(input.sessaoExercicioId);

    const sessao = await this.dependencies.sessaoTreinoRepository.findById(
      sessaoExercicio.toPrimitives().sessaoTreinoId
    );
    if (!sessao?.isAtiva()) throw new SessaoEncerradaError();

    // Segmentos (degraus) so existem para reps_load — mesma invariante de
    // RegistrarSegmentoUseCase. Falha antes de abrir a transacao: nenhuma serie
    // deve ser gravada sob uma mae que nao aceita degrau (achado #3, revisao 1).
    if ((input.segmentos?.length ?? 0) > 0 && sessaoExercicio.toPrimitives().trackingTypeSnapshot !== 'reps_load') {
      throw new SessaoValidationError('Segmentos so existem para exercicios de carga x repeticoes.');
    }

    let serie!: SerieRegistrada;

    const saveNew = async () => {
      // MAX(ordem)+1, nao COUNT+1: deletar uma serie do meio (soft-delete) deixa um gap;
      // COUNT+1 reutilizaria um ordem ja existente e duplicaria a coluna `Serie` no CSV.
      const maxOrdem = await this.dependencies.serieRegistradaRepository.maxOrdemBySessaoExercicioId(
        input.sessaoExercicioId
      );
      const sePrimitives = sessaoExercicio.toPrimitives();
      serie = SerieRegistrada.create({
        id: this.dependencies.idGenerator(),
        sessaoExercicioId: input.sessaoExercicioId,
        tipoSerie: input.tipoSerie ?? 'valida',
        ordem: maxOrdem + 1,
        cargaKg: input.cargaKg,
        repeticoes: input.repeticoes,
        duracaoSegundos: input.duracaoSegundos,
        distanciaMetros: input.distanciaMetros,
        intensidade: input.intensidade,
        observacao: input.observacao,
        trackingType: sePrimitives.trackingTypeSnapshot as 'reps_load' | 'cardio' | 'hold' | 'reps_only',
      });
      await this.dependencies.serieRegistradaRepository.save(serie);

      for (const [index, segmentoInput] of (input.segmentos ?? []).entries()) {
        const segmento = SerieSegmento.create({
          id: this.dependencies.idGenerator(),
          serieId: serie.toPrimitives().id,
          ordem: index + 2,
          cargaKg: segmentoInput.cargaKg,
          repeticoes: segmentoInput.repeticoes,
          descansoSegundos: segmentoInput.descansoSegundos,
        });
        await this.dependencies.serieSegmentoRepository.save(segmento);
      }

      // Move atualizarCargaSeNecessario inside transaction for atomicity
      await this.atualizarCargaSeNecessario(input, sePrimitives, sessao.toPrimitives().treinoId);
    };

    if (this.dependencies.database) {
      await this.dependencies.database.withTransaction(saveNew);
    } else {
      await saveNew();
    }

    return serie.toPrimitives();
  }

  private async atualizarCargaSeNecessario(
    input: RegistrarSerieInput,
    se: SessaoExercicioPrimitives,
    treinoId: string
  ): Promise<void> {
    if (input.repeticoes == null || input.cargaKg == null) return;
    if (se.execucoesRecomendadas == null) return;
    if (input.repeticoes < se.execucoesRecomendadas) return;
    if (se.cargaPadrao != null && input.cargaKg <= se.cargaPadrao) return;

    // Atualiza snapshot da sessao para refletir imediatamente na UI
    const seAtualizado = SessaoExercicio.restore({ ...se, cargaPadrao: input.cargaKg });
    await this.dependencies.sessaoExercicioRepository.save(seAtualizado);

    // Atualiza template do treino para pre-preencher proximas sessoes
    const te = await this.dependencies.treinoExercicioRepository.findByTreinoIdAndExercicioId(
      treinoId,
      se.exercicioId
    );
    if (!te) return;

    const tep = te.toPrimitives();
    await this.dependencies.treinoExercicioRepository.updateRecomendacoes(
      tep.id,
      tep.seriesRecomendadas,
      tep.execucoesRecomendadas,
      input.cargaKg,
      tep.tempoDescansoSegundos
    );
  }
}
