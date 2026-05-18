import { SerieRegistrada, type SerieRegistradaPrimitives } from '../../../domain/sessoes/entities/SerieRegistrada';
import { SessaoExercicio, type SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SerieRegistradaRepository } from '../../../domain/sessoes/repositories/SerieRegistradaRepository';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import type { TreinoExercicioRepository } from '../../../domain/treinos/repositories/TreinoExercicioRepository';
import { SessaoEncerradaError } from '../errors/SessaoEncerradaError';
import { SessaoExercicioNotFoundError } from '../errors/SessaoExercicioNotFoundError';

export interface RegistrarSerieInput {
  sessaoExercicioId: string;
  cargaKg: number;
  repeticoes: number;
  observacao?: string;
}

interface RegistrarSerieUseCaseDependencies {
  sessaoTreinoRepository: SessaoTreinoRepository;
  sessaoExercicioRepository: SessaoExercicioRepository;
  serieRegistradaRepository: SerieRegistradaRepository;
  treinoExercicioRepository: TreinoExercicioRepository;
  idGenerator: () => string;
}

/** Registra uma serie (aquecimento ou valida) em um exercicio da sessao ativa. */
export class RegistrarSerieUseCase {
  constructor(private readonly dependencies: RegistrarSerieUseCaseDependencies) {}

  /**
   * A ordem da serie e atribuida automaticamente (count + 1 dentro do sessaoExercicio).
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

    const count = await this.dependencies.serieRegistradaRepository.countBySessaoExercicioId(
      input.sessaoExercicioId
    );

    const serie = SerieRegistrada.create({
      id: this.dependencies.idGenerator(),
      sessaoExercicioId: input.sessaoExercicioId,
      tipoSerie: 'valida',
      ordem: count + 1,
      cargaKg: input.cargaKg,
      repeticoes: input.repeticoes,
      observacao: input.observacao,
    });

    await this.dependencies.serieRegistradaRepository.save(serie);

    await this.atualizarCargaSeNecessario(input, sessaoExercicio.toPrimitives(), sessao.toPrimitives().treinoId);

    return serie.toPrimitives();
  }

  private async atualizarCargaSeNecessario(
    input: RegistrarSerieInput,
    se: SessaoExercicioPrimitives,
    treinoId: string
  ): Promise<void> {
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
