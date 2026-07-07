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

  async listComMidiaPendente(): Promise<{ id: string; mediaOnline: string }[]> {
    const out: { id: string; mediaOnline: string }[] = [];
    for (const e of this.exercisesById.values()) {
      const p = e.toPrimitives();
      if (p.mediaOnline && !p.mediaLocal) out.push({ id: p.id, mediaOnline: p.mediaOnline });
    }
    return out;
  }

  async updateMedia(id: string, mediaOnline: string | null, mediaLocal: string | null): Promise<void> {
    const ex = this.exercisesById.get(id);
    if (!ex) return;
    const p = ex.toPrimitives();
    const updated = Exercise.restore({ ...p, mediaOnline, mediaLocal });
    this.exercisesById.set(id, updated);
  }

  private readonly alternativasById = new Map<string, Set<string>>();
  private readonly equivalentById = new Map<string, Set<string>>();
  private readonly muscleGroupById = new Map<string, Set<string>>();

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

  async findByNameOrVariation(query: string): Promise<Exercise[]> {
    const q = query.trim().toLowerCase();
    const results: Exercise[] = [];
    for (const exercise of this.exercisesById.values()) {
      const p = exercise.toPrimitives();
      const inName = p.normalizedName.includes(q);
      const inVariations = p.nameVariations.some((v) => v.toLowerCase().includes(q));
      if (inName || inVariations) results.push(exercise);
    }
    return results;
  }

  async listEquivalentAlternativas(exercicioId: string): Promise<Exercise[]> {
    const ids = this.equivalentById.get(exercicioId) ?? new Set();
    return [...ids].map((id) => this.exercisesById.get(id)).filter(Boolean) as Exercise[];
  }

  async addEquivalentAlternativa(exercicioId: string, alternativaId: string): Promise<void> {
    const set = this.equivalentById.get(exercicioId) ?? new Set<string>();
    set.add(alternativaId);
    this.equivalentById.set(exercicioId, set);
  }

  async listMuscleGroupAlternativas(exercicioId: string): Promise<Exercise[]> {
    const ids = this.muscleGroupById.get(exercicioId) ?? new Set();
    return [...ids].map((id) => this.exercisesById.get(id)).filter(Boolean) as Exercise[];
  }

  async addMuscleGroupAlternativa(exercicioId: string, alternativaId: string): Promise<void> {
    const set = this.muscleGroupById.get(exercicioId) ?? new Set<string>();
    set.add(alternativaId);
    this.muscleGroupById.set(exercicioId, set);
  }

  async upsertCatalogExercise(exercise: Exercise, equivalentIds: string[], muscleGroupIds: string[]): Promise<void> {
    const p = exercise.toPrimitives();
    this.exercisesById.set(p.id, exercise);
    for (const altId of equivalentIds) await this.addEquivalentAlternativa(p.id, altId);
    for (const altId of muscleGroupIds) await this.addMuscleGroupAlternativa(p.id, altId);
  }
}
