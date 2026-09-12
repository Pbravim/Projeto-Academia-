import { SerieSegmento, type SerieSegmentoPrimitives } from '../../../domain/sessoes/entities/SerieSegmento';
import { SessaoValidationError } from '../../../domain/sessoes/errors/SessaoValidationError';
import type { SerieRegistradaRepository } from '../../../domain/sessoes/repositories/SerieRegistradaRepository';
import type { SerieSegmentoRepository } from '../../../domain/sessoes/repositories/SerieSegmentoRepository';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import { SerieNotFoundError } from '../errors/SerieNotFoundError';
import { SessaoEncerradaError } from '../errors/SessaoEncerradaError';

export interface RegistrarSegmentoInput {
  serieId: string;
  cargaKg: number;
  repeticoes: number;
  descansoSegundos?: number;
}

interface RegistrarSegmentoUseCaseDependencies {
  serieRegistradaRepository: SerieRegistradaRepository;
  serieSegmentoRepository: SerieSegmentoRepository;
  sessaoExercicioRepository: SessaoExercicioRepository;
  sessaoTreinoRepository: SessaoTreinoRepository;
  idGenerator: () => string;
}

/**
 * Registra um degrau (drop set/rest-pause/piramide) sobre uma serie-mae ja registrada.
 * Segmentos so existem para exercicios `reps_load` (carga x reps) — cardio/hold/reps_only
 * nao tem degrau.
 */
export class RegistrarSegmentoUseCase {
  constructor(private readonly dependencies: RegistrarSegmentoUseCaseDependencies) {}

  /**
   * A ordem do degrau e atribuida automaticamente (maior ordem ja usada nos degraus + 1;
   * 2 se ainda nao ha degraus — o degrau 1 e a propria serie-mae).
   * @throws {SerieNotFoundError} serie-mae nao encontrada
   * @throws {SessaoEncerradaError} sessao pai ja foi finalizada
   * @throws {SessaoValidationError} exercicio nao e reps_load, ou carga/reps invalidos
   */
  async execute(input: RegistrarSegmentoInput): Promise<SerieSegmentoPrimitives> {
    const serie = await this.dependencies.serieRegistradaRepository.findById(input.serieId);
    if (!serie) throw new SerieNotFoundError(input.serieId);

    const seriePrim = serie.toPrimitives();
    const sessaoExercicio = await this.dependencies.sessaoExercicioRepository.findById(
      seriePrim.sessaoExercicioId
    );
    if (!sessaoExercicio) throw new SerieNotFoundError(input.serieId);

    const sePrim = sessaoExercicio.toPrimitives();
    const sessao = await this.dependencies.sessaoTreinoRepository.findById(sePrim.sessaoTreinoId);
    if (!sessao?.isAtiva()) throw new SessaoEncerradaError();

    if (sePrim.trackingTypeSnapshot !== 'reps_load') {
      throw new SessaoValidationError('Segmentos so existem para exercicios de carga x repeticoes.');
    }

    const maxOrdem = await this.dependencies.serieSegmentoRepository.maxOrdemBySerieId(input.serieId);
    const segmento = SerieSegmento.create({
      id: this.dependencies.idGenerator(),
      serieId: input.serieId,
      ordem: Math.max(maxOrdem, 1) + 1,
      cargaKg: input.cargaKg,
      repeticoes: input.repeticoes,
      descansoSegundos: input.descansoSegundos,
    });
    await this.dependencies.serieSegmentoRepository.save(segmento);

    return segmento.toPrimitives();
  }
}
