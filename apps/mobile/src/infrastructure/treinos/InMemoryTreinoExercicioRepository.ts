import { TreinoExercicio, type MetodoExercicio } from '../../domain/treinos/entities/TreinoExercicio';
import type { TreinoExercicioRepository } from '../../domain/treinos/repositories/TreinoExercicioRepository';

export class InMemoryTreinoExercicioRepository implements TreinoExercicioRepository {
  private readonly itemsById = new Map<string, TreinoExercicio>();

  async save(treinoExercicio: TreinoExercicio): Promise<void> {
    this.itemsById.set(treinoExercicio.toPrimitives().id, treinoExercicio);
  }

  async listByTreinoId(treinoId: string): Promise<TreinoExercicio[]> {
    return Array.from(this.itemsById.values())
      .filter((item) => item.toPrimitives().treinoId === treinoId)
      .sort((a, b) => a.toPrimitives().ordem - b.toPrimitives().ordem);
  }

  async findById(id: string): Promise<TreinoExercicio | null> {
    return this.itemsById.get(id) ?? null;
  }

  async findByTreinoIdAndExercicioId(
    treinoId: string,
    exercicioId: string
  ): Promise<TreinoExercicio | null> {
    for (const item of this.itemsById.values()) {
      const p = item.toPrimitives();
      if (p.treinoId === treinoId && p.exercicioId === exercicioId) {
        return item;
      }
    }
    return null;
  }

  async countByTreinoId(treinoId: string): Promise<number> {
    let count = 0;
    for (const item of this.itemsById.values()) {
      if (item.toPrimitives().treinoId === treinoId) count++;
    }
    return count;
  }

  async maxOrdemByTreinoId(treinoId: string): Promise<number> {
    let max = 0;
    for (const item of this.itemsById.values()) {
      const p = item.toPrimitives();
      if (p.treinoId === treinoId && p.ordem > max) max = p.ordem;
    }
    return max;
  }

  async findTombstonedId(_treinoId: string, _exercicioId: string): Promise<string | null> {
    // In-memory: delete é físico, não há tombstones para reativar.
    return null;
  }

  async countAllByTreino(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const item of this.itemsById.values()) {
      const { treinoId } = item.toPrimitives();
      counts[treinoId] = (counts[treinoId] ?? 0) + 1;
    }
    return counts;
  }

  async updateOrdem(id: string, ordem: number): Promise<void> {
    const item = this.itemsById.get(id);
    if (!item) return;
    this.itemsById.set(id, TreinoExercicio.restore({ ...item.toPrimitives(), ordem }));
  }

  async updateRecomendacoes(id: string, seriesRecomendadas: number | null, execucoesRecomendadas: number | null, cargaPadrao: number | null, tempoDescansoSegundos: number | null): Promise<void> {
    const item = this.itemsById.get(id);
    if (!item) return;
    this.itemsById.set(id, TreinoExercicio.restore({ ...item.toPrimitives(), seriesRecomendadas, execucoesRecomendadas, cargaPadrao, tempoDescansoSegundos }));
  }

  async updateMetodoGrupo(id: string, metodo: MetodoExercicio, grupoId: string | null): Promise<void> {
    const item = this.itemsById.get(id);
    if (!item) return;
    this.itemsById.set(id, TreinoExercicio.restore({ ...item.toPrimitives(), metodo, grupoId }));
  }

  async delete(id: string): Promise<void> {
    this.itemsById.delete(id);
  }

  async deleteByTreinoId(treinoId: string): Promise<void> {
    for (const [id, item] of this.itemsById.entries()) {
      if (item.toPrimitives().treinoId === treinoId) {
        this.itemsById.delete(id);
      }
    }
  }

  async deleteByExercicioId(exercicioId: string): Promise<void> {
    for (const [id, item] of this.itemsById.entries()) {
      if (item.toPrimitives().exercicioId === exercicioId) {
        this.itemsById.delete(id);
      }
    }
  }
}
