import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';
import { BaixarMidiaExercicioUseCase, isDownloadableUrl } from './BaixarMidiaExercicioUseCase';

interface BaixarTodasMidiasDependencies {
  exerciseRepository: ExerciseRepository;
  baixarMidia: BaixarMidiaExercicioUseCase;
}

const CONCURRENCY = 3;

/** Baixa em background as mídias de todos os exercícios que ainda não têm arquivo local. */
export class BaixarTodasMidiasUseCase {
  constructor(private readonly deps: BaixarTodasMidiasDependencies) {}

  async execute(): Promise<void> {
    const exercises = await this.deps.exerciseRepository.list();

    const pending = exercises
      .map((ex) => ex.toPrimitives())
      .filter((p) => p.mediaOnline && isDownloadableUrl(p.mediaOnline) && !p.mediaLocal);

    const queue = [...pending];

    const worker = async () => {
      while (queue.length > 0) {
        const p = queue.shift();
        if (!p) break;
        try {
          await this.deps.baixarMidia.execute(p.id);
        } catch {
          // silently skip failures — will retry on next startup
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker));
  }
}
