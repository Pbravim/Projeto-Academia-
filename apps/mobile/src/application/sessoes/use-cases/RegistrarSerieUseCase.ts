import { SerieRegistrada, type SerieRegistradaPrimitives, type TipoSerie } from '../../../domain/sessoes/entities/SerieRegistrada';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SerieRegistradaRepository } from '../../../domain/sessoes/repositories/SerieRegistradaRepository';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import { SessaoEncerradaError } from '../errors/SessaoEncerradaError';
import { SessaoExercicioNotFoundError } from '../errors/SessaoExercicioNotFoundError';

export interface RegistrarSerieInput {
  sessaoExercicioId: string;
  tipoSerie: TipoSerie;
  cargaKg: number;
  repeticoes: number;
  observacao?: string;
}

interface RegistrarSerieUseCaseDependencies {
  sessaoTreinoRepository: SessaoTreinoRepository;
  sessaoExercicioRepository: SessaoExercicioRepository;
  serieRegistradaRepository: SerieRegistradaRepository;
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
      tipoSerie: input.tipoSerie,
      ordem: count + 1,
      cargaKg: input.cargaKg,
      repeticoes: input.repeticoes,
      observacao: input.observacao,
    });

    await this.dependencies.serieRegistradaRepository.save(serie);

    return serie.toPrimitives();
  }
}
