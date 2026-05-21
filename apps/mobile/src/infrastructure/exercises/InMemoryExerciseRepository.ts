import { Exercise } from '../../domain/exercises/entities/Exercise';
import type { ExerciseRepository } from '../../domain/exercises/repositories/ExerciseRepository';

export class InMemoryExerciseRepository implements ExerciseRepository {
  private readonly exercisesById = new Map<string, Exercise>();

  async save(exercise: Exercise): Promise<void> {
    this.exercisesById.set(exercise.toPrimitives().id, exercise);
  }

  async list(): Promise<Exercise[]> {
    return Array.from(this.exercisesById.values());
  }

  async findById(id: string): Promise<Exercise | null> {
    return this.exercisesById.get(id) ?? null;
  }

  async findByIds(ids: string[]): Promise<Exercise[]> {
    return ids.flatMap((id) => {
      const e = this.exercisesById.get(id);
      return e ? [e] : [];
    });
  }

  async findByNormalizedName(normalizedName: string): Promise<Exercise | null> {
    for (const exercise of this.exercisesById.values()) {
      if (exercise.toPrimitives().normalizedName === normalizedName) {
        return exercise;
      }
    }

    return null;
  }

  async delete(id: string): Promise<void> {
    this.exercisesById.delete(id);
  }

  async updateMedia(id: string, mediaOnline: string | null, mediaLocal: string | null): Promise<void> {
    const ex = this.exercisesById.get(id);
    if (!ex) return;
    const p = ex.toPrimitives();
    const updated = Exercise.restore({ ...p, mediaOnline, mediaLocal });
    this.exercisesById.set(id, updated);
  }

  private readonly alternativasById = new Map<string, Set<string>>();

  async listAlternativas(exercicioId: string): Promise<Exercise[]> {
    const ids = this.alternativasById.get(exercicioId) ?? new Set();
    return [...ids].map((id) => this.exercisesById.get(id)).filter(Boolean) as Exercise[];
  }

  async addAlternativa(exercicioId: string, alternativaId: string): Promise<void> {
    const set = this.alternativasById.get(exercicioId) ?? new Set<string>();
    set.add(alternativaId);
    this.alternativasById.set(exercicioId, set);
  }

  async removeAlternativa(exercicioId: string, alternativaId: string): Promise<void> {
    this.alternativasById.get(exercicioId)?.delete(alternativaId);
  }
}
