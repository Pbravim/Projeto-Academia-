import type { SerieRegistradaRepository } from '../../../domain/sessoes/repositories/SerieRegistradaRepository';
import type { SerieSegmentoRepository } from '../../../domain/sessoes/repositories/SerieSegmentoRepository';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import { SegmentoNotFoundError } from '../errors/SegmentoNotFoundError';
import { SessaoEncerradaError } from '../errors/SessaoEncerradaError';

interface RemoverSegmentoUseCaseDependencies {
  serieSegmentoRepository: SerieSegmentoRepository;
  serieRegistradaRepository: SerieRegistradaRepository;
  sessaoExercicioRepository: SessaoExercicioRepository;
  sessaoTreinoRepository: SessaoTreinoRepository;
}

/** Remove um degrau (segmento) registrado por engano durante a sessao ativa. */
export class RemoverSegmentoUseCase {
  constructor(private readonly dependencies: RemoverSegmentoUseCaseDependencies) {}

  /**
   * @throws {SegmentoNotFoundError} segmento nao encontrado
   * @throws {SessaoEncerradaError} sessao pai ja foi finalizada
   */
  async execute(segmentoId: string): Promise<void> {
    const segmento = await this.dependencies.serieSegmentoRepository.findById(segmentoId);
    if (!segmento) throw new SegmentoNotFoundError(segmentoId);

    const serie = await this.dependencies.serieRegistradaRepository.findById(segmento.toPrimitives().serieId);
    if (serie) {
      const sessaoExercicio = await this.dependencies.sessaoExercicioRepository.findById(
        serie.toPrimitives().sessaoExercicioId
      );
      if (sessaoExercicio) {
        const sessao = await this.dependencies.sessaoTreinoRepository.findById(
          sessaoExercicio.toPrimitives().sessaoTreinoId
        );
        if (sessao && !sessao.isAtiva()) throw new SessaoEncerradaError();
      }
    }

    await this.dependencies.serieSegmentoRepository.delete(segmentoId);
  }
}
