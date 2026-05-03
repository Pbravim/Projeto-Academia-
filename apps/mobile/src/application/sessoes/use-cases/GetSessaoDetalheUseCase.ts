import type { SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';
import type { SerieRegistradaPrimitives } from '../../../domain/sessoes/entities/SerieRegistrada';
import type { SessaoTreinoPrimitives } from '../../../domain/sessoes/entities/SessaoTreino';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SerieRegistradaRepository } from '../../../domain/sessoes/repositories/SerieRegistradaRepository';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import { SessaoNotFoundError } from '../errors/SessaoNotFoundError';

export interface SessaoExercicioComSeries {
  sessaoExercicio: SessaoExercicioPrimitives;
  series: SerieRegistradaPrimitives[];
}

export interface SessaoDetalhe {
  sessao: SessaoTreinoPrimitives;
  exercicios: SessaoExercicioComSeries[];
}

interface GetSessaoDetalheUseCaseDependencies {
  sessaoTreinoRepository: SessaoTreinoRepository;
  sessaoExercicioRepository: SessaoExercicioRepository;
  serieRegistradaRepository: SerieRegistradaRepository;
}

export class GetSessaoDetalheUseCase {
  constructor(private readonly dependencies: GetSessaoDetalheUseCaseDependencies) {}

  async execute(sessaoId: string): Promise<SessaoDetalhe> {
    const sessao = await this.dependencies.sessaoTreinoRepository.findById(sessaoId);
    if (!sessao) throw new SessaoNotFoundError(sessaoId);

    const exercicios = await this.dependencies.sessaoExercicioRepository.listBySessaoId(sessaoId);

    const exerciciosComSeries: SessaoExercicioComSeries[] = await Promise.all(
      exercicios.map(async (se) => {
        const series = await this.dependencies.serieRegistradaRepository.listBySessaoExercicioId(
          se.toPrimitives().id
        );
        return {
          sessaoExercicio: se.toPrimitives(),
          series: series.map((s) => s.toPrimitives()),
        };
      })
    );

    return { sessao: sessao.toPrimitives(), exercicios: exerciciosComSeries };
  }
}
