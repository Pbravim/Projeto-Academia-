import type { MetodoExercicio } from '../../domain/treinos/entities/TreinoExercicio';

export interface MetodoVisual {
  label: string;
  color: string;
}

/**
 * Apresentação (label + cor do badge) dos métodos de execução não-`normal`.
 * Fonte única para `SessaoAtivaScreen` e `ExercicioCard`. O método `normal`
 * não tem badge, por isso é excluído do mapa.
 */
export const METODO_CONFIG: Record<Exclude<MetodoExercicio, 'normal'>, MetodoVisual> = {
  drop_set: { label: 'Drop-set', color: '#9333ea' },
  piramide: { label: 'Pirâmide', color: '#d97706' },
  rest_pause: { label: 'Rest-pause', color: '#e11d48' },
};
