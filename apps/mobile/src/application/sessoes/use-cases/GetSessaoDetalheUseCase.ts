import type { SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';
import type { SerieRegistradaPrimitives } from '../../../domain/sessoes/entities/SerieRegistrada';
import type { SessaoTreinoPrimitives } from '../../../domain/sessoes/entities/SessaoTreino';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SerieRegistradaRepository } from '../../../domain/sessoes/repositories/SerieRegistradaRepository';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';
import { SessaoNotFoundError } from '../errors/SessaoNotFoundError';

export interface SessaoExercicioComSeries {
  sessaoExercicio: SessaoExercicioPrimitives;
  series: SerieRegistradaPrimitives[];
  mediaOnline: string | null;
  mediaLocal: string | null;
}

export interface SessaoDetalhe {
  sessao: SessaoTreinoPrimitives;
  exercicios: SessaoExercicioComSeries[];
}

interface GetSessaoDetalheUseCaseDependencies {
  sessaoTreinoRepository: SessaoTreinoRepository;
  sessaoExercicioRepository: SessaoExercicioRepository;
  serieRegistradaRepository: SerieRegistradaRepository;
  exerciseRepository: ExerciseRepository;
}

export class GetSessaoDetalheUseCase {
  constructor(private readonly dependencies: GetSessaoDetalheUseCaseDependencies) {}

  async execute(sessaoId: string): Promise<SessaoDetalhe> {
    const sessao = await this.dependencies.sessaoTreinoRepository.findById(sessaoId);
    if (!sessao) throw new SessaoNotFoundError(sessaoId);

    const exercicios = await this.dependencies.sessaoExercicioRepository.listBySessaoId(sessaoId);

    const exercicioIds = exercicios.map((se) => se.toPrimitives().exercicioId);
    const [catalogExercicios, allSeries] = await Promise.all([
      this.dependencies.exerciseRepository.findByIds(exercicioIds),
      Promise.all(exercicios.map((se) =>
        this.dependencies.serieRegistradaRepository.listBySessaoExercicioId(se.toPrimitives().id)
      )),
    ]);

    const exerciseMap = new Map(catalogExercicios.map((e) => [e.toPrimitives().id, e.toPrimitives()]));

    const exerciciosComSeries: SessaoExercicioComSeries[] = exercicios.map((se, i) => {
      const primitives = se.toPrimitives();
      const exercisePrimitives = exerciseMap.get(primitives.exercicioId);
      return {
        sessaoExercicio: primitives,
        series: allSeries[i].map((s) => s.toPrimitives()),
        mediaOnline: exercisePrimitives?.mediaOnline ?? null,
        mediaLocal: exercisePrimitives?.mediaLocal ?? null,
      };
    });

    return { sessao: sessao.toPrimitives(), exercicios: exerciciosComSeries };
  }
}
