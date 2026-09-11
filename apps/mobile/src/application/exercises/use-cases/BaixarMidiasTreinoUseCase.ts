import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';
import type { TreinoExercicioRepository } from '../../../domain/treinos/repositories/TreinoExercicioRepository';

import { BaixarMidiaExercicioUseCase, isDownloadableUrl } from './BaixarMidiaExercicioUseCase';

export interface ProgressoBaixarMidias {
  total: number;
  concluido: number;
  nomeAtual: string;
}

interface BaixarMidiasTreinoDependencies {
  exerciseRepository: ExerciseRepository;
  treinoExercicioRepository: TreinoExercicioRepository;
  baixarMidia: BaixarMidiaExercicioUseCase;
}

/** Baixa as mídias de todos os exercícios de um treino que ainda não têm arquivo local. */
export class BaixarMidiasTreinoUseCase {
  constructor(private readonly deps: BaixarMidiasTreinoDependencies) {}

  async execute(
    treinoId: string,
    onProgress?: (progresso: ProgressoBaixarMidias) => void
  ): Promise<{ baixados: number; ignorados: number }> {
    const treinoExercicios = await this.deps.treinoExercicioRepository.listByTreinoId(treinoId);

    const exercicioIds = treinoExercicios.map((te) => te.toPrimitives().exercicioId);
    const exercises = await this.deps.exerciseRepository.findByIds(exercicioIds);
    const exerciseMap = new Map(exercises.map((e) => [e.toPrimitives().id, e]));

    const pendentes: Array<{ id: string; nome: string }> = [];
    let semMidia = 0;
    let jaTemLocal = 0;

    for (const te of treinoExercicios) {
      const ex = exerciseMap.get(te.toPrimitives().exercicioId);
      if (!ex) continue;
      const p = ex.toPrimitives();
      if (!p.mediaOnline || !isDownloadableUrl(p.mediaOnline)) { semMidia++; continue; }
      if (p.mediaLocal) { jaTemLocal++; continue; }
      pendentes.push({ id: p.id, nome: p.name });
    }

    let baixados = 0;
    const ignorados = semMidia + jaTemLocal;

    for (let i = 0; i < pendentes.length; i++) {
      const item = pendentes[i]!;
      onProgress?.({ total: pendentes.length, concluido: i, nomeAtual: item.nome });
      try {
        await this.deps.baixarMidia.execute(item.id);
        baixados++;
      } catch {
        // Continua mesmo se um falhar
      }
    }

    onProgress?.({ total: pendentes.length, concluido: pendentes.length, nomeAtual: '' });
    return { baixados, ignorados };
  }
}
