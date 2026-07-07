import type { MetodoExercicio, TreinoExercicio } from '../entities/TreinoExercicio';

export interface TreinoExercicioRepository {
  save(treinoExercicio: TreinoExercicio): Promise<void>;
  listByTreinoId(treinoId: string): Promise<TreinoExercicio[]>;
  findById(id: string): Promise<TreinoExercicio | null>;
  findByTreinoIdAndExercicioId(treinoId: string, exercicioId: string): Promise<TreinoExercicio | null>;
  countByTreinoId(treinoId: string): Promise<number>;
  countAllByTreino(): Promise<Record<string, number>>;
  /** Maior `ordem` já usada no treino (inclui soft-deletadas), ou 0. count+1 colide após remoção do meio. */
  maxOrdemByTreinoId(treinoId: string): Promise<number>;
  /** Id de uma linha tombstoned para o par (treino, exercício), para reativação no re-add. */
  findTombstonedId(treinoId: string, exercicioId: string): Promise<string | null>;
  updateOrdem(id: string, ordem: number): Promise<void>;
  updateRecomendacoes(id: string, seriesRecomendadas: number | null, execucoesRecomendadas: number | null, cargaPadrao: number | null, tempoDescansoSegundos: number | null): Promise<void>;
  updateMetodoGrupo(id: string, metodo: MetodoExercicio, grupoId: string | null): Promise<void>;
  delete(id: string): Promise<void>;
  deleteByTreinoId(treinoId: string): Promise<void>;
  deleteByExercicioId(exercicioId: string): Promise<void>;
}
