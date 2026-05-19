import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';
import { BaixarMidiaExercicioUseCase, isDownloadableUrl } from './BaixarMidiaExercicioUseCase';

interface BaixarTodasMidiasDependencies {
  exerciseRepository: ExerciseRepository;
  baixarMidia: BaixarMidiaExercicioUseCase;
}

/** Baixa em background as mídias de todos os exercícios que ainda não têm arquivo local. */
export class BaixarTodasMidiasUseCase {
  constructor(private readonly deps: BaixarTodasMidiasDependencies) {}

  async execute(): Promise<void> {
    const exercises = await this.deps.exerciseRepository.list();

    for (const ex of exercises) {
      const p = ex.toPrimitives();
      if (!p.mediaOnline || !isDownloadableUrl(p.mediaOnline) || p.mediaLocal) continue;
      try {
        await this.deps.baixarMidia.execute(p.id);
      } catch {
        // silently skip failures — will retry on next startup
      }
    }
  }
}
