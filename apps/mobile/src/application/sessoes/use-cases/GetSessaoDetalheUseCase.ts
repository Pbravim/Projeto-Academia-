import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';
import type { SerieRegistradaPrimitives } from '../../../domain/sessoes/entities/SerieRegistrada';
import type { SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';
import type { SessaoTreinoPrimitives } from '../../../domain/sessoes/entities/SessaoTreino';
import type { SerieRegistradaRepository } from '../../../domain/sessoes/repositories/SerieRegistradaRepository';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
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
    const sessaoExercicioIds = exercicios.map((se) => se.toPrimitives().id);
    const [catalogExercicios, todasSeries] = await Promise.all([
      this.dependencies.exerciseRepository.findByIds(exercicioIds),
      this.dependencies.serieRegistradaRepository.listBySessaoExercicioIds(sessaoExercicioIds),
    ]);

    const seriesPorSessaoExercicio = new Map<string, SerieRegistradaPrimitives[]>();
    for (const s of todasSeries) {
      const p = s.toPrimitives();
      const arr = seriesPorSessaoExercicio.get(p.sessaoExercicioId) ?? [];
      arr.push(p);
      seriesPorSessaoExercicio.set(p.sessaoExercicioId, arr);
    }

    const exerciseMap = new Map(catalogExercicios.map((e) => [e.toPrimitives().id, e.toPrimitives()]));

    const exerciciosComSeries: SessaoExercicioComSeries[] = exercicios.map((se) => {
      const primitives = se.toPrimitives();
      const exercisePrimitives = exerciseMap.get(primitives.exercicioId);
      return {
        sessaoExercicio: primitives,
        series: seriesPorSessaoExercicio.get(primitives.id) ?? [],
        mediaOnline: exercisePrimitives?.mediaOnline ?? null,
        mediaLocal: exercisePrimitives?.mediaLocal ?? null,
      };
    });

    return { sessao: sessao.toPrimitives(), exercicios: exerciciosComSeries };
  }
}
