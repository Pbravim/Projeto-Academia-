import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';
import type { TreinoExercicioRepository } from '../../../domain/treinos/repositories/TreinoExercicioRepository';
import type { TreinoRepository } from '../../../domain/treinos/repositories/TreinoRepository';
import { buildTreinoJson, serializeTreinoJson, type TreinoJsonExportItem } from '../../../domain/treinos/treino-json/serializeTreinoJson';
import { normalizeText } from '../../../shared/utils/normalizeText';
import { TreinoNotFoundError } from '../errors/TreinoNotFoundError';

interface ExportarTreinoUseCaseDependencies {
  treinoRepository: TreinoRepository;
  treinoExercicioRepository: TreinoExercicioRepository;
  exerciseRepository: ExerciseRepository;
}

export interface TreinoExportado {
  nomeArquivo: string;
  conteudo: string;
}

function slugify(nome: string): string {
  return normalizeText(nome)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Serializa um treino e seus exercicios no schema treino@1 (puro; sem compartilhamento — ver 38b). */
export class ExportarTreinoUseCase {
  constructor(private readonly deps: ExportarTreinoUseCaseDependencies) {}

  /** @throws {TreinoNotFoundError} treino nao encontrado */
  async execute(treinoId: string): Promise<TreinoExportado> {
    const treino = await this.deps.treinoRepository.findById(treinoId);
    if (!treino) throw new TreinoNotFoundError(treinoId);
    const treinoPrimitives = treino.toPrimitives();

    const treinoExercicios = await this.deps.treinoExercicioRepository.listByTreinoId(treinoId);
    const exercicios = await this.deps.exerciseRepository.findByIds(treinoExercicios.map((te) => te.toPrimitives().exercicioId));
    const exercicioById = new Map(exercicios.map((exercise) => [exercise.toPrimitives().id, exercise.toPrimitives()]));

    // Leniente por design: um TreinoExercicio cujo exercicio nao veio de findByIds (deletado
    // do catalogo) e omitido do export em vez de lancar — o treino continua exportavel.
    const itens: TreinoJsonExportItem[] = treinoExercicios.flatMap((te) => {
      const teP = te.toPrimitives();
      const exercise = exercicioById.get(teP.exercicioId);
      return exercise ? [{ te: teP, exercise }] : [];
    });

    const conteudo = serializeTreinoJson(buildTreinoJson(treinoPrimitives, itens));
    const nomeArquivo = `treino_${slugify(treinoPrimitives.name)}.json`;

    return { nomeArquivo, conteudo };
  }
}
