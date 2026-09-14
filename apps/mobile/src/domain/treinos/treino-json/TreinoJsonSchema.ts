import type { MetodoExercicio } from '../entities/TreinoExercicio';

/** Schema atual do JSON de import/export de treino — ver docs/pipeline/onda-33-38-44/plan-38.md. */
export const TREINO_JSON_SCHEMA = 'projeto-academia/treino@1';

/** Item do JSON já validado: `metodo` sempre presente (default aplicado pelo parser); demais campos opcionais. */
export interface TreinoJsonExercicioV1 {
  nome: string;
  equipamento?: string;
  seriesAlvo?: number;
  repsAlvo?: number;
  metodo: MetodoExercicio;
  descansoSegundos?: number;
  grupo?: string;
  duracaoSegundos?: number;
  distanciaMetros?: number;
  intensidade?: number;
}

export interface TreinoJsonV1 {
  schema: typeof TREINO_JSON_SCHEMA;
  nome: string;
  objetivo?: string;
  exercicios: TreinoJsonExercicioV1[];
}

/** Saída do parser: treino validado, antes do casamento com o catálogo. */
export interface TreinoImportado {
  nome: string;
  objetivo: string | null;
  exercicios: TreinoJsonExercicioV1[];
}
