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
    // Consulta leve (id + url): antes era list() completo — 500+ linhas com
    // 3 JSON.parse cada, a CADA boot, normalmente só para descobrir que não
    // há nada a baixar.
    const pending = (await this.deps.exerciseRepository.listComMidiaPendente())
      .filter((p) => isDownloadableUrl(p.mediaOnline));

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
