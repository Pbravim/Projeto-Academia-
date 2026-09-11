import type { MetodoExercicio } from '../../domain/treinos/entities/TreinoExercicio';

import { type AppLocale,translate } from './i18n/core';

export interface MetodoVisual {
  color: string;
}

type MetodoComBadge = Exclude<MetodoExercicio, 'normal'>;

/**
 * Cor do badge dos métodos de execução não-`normal`.
 * Fonte única para `SessaoAtivaScreen`, `ExercicioCard`, `ExercicioDetalheScreen` e
 * `BiSetDetalheScreen`. O método `normal` não tem badge, por isso é excluído do mapa.
 * Os labels são locale-aware — veja `metodoLabel`/`metodoDescricao` abaixo.
 */
export const METODO_CONFIG: Record<MetodoComBadge, MetodoVisual> = {
  drop_set: { color: '#9333ea' },
  piramide: { color: '#d97706' },
  rest_pause: { color: '#e11d48' },
};

/** Label traduzido de um método de execução (inclui `normal`). */
export function metodoLabel(metodo: MetodoExercicio, locale: AppLocale): string {
  return translate(locale, `sessao.metodo.${metodo}`);
}

/** Descrição traduzida de um método de execução não-`normal`. */
export function metodoDescricao(metodo: MetodoComBadge, locale: AppLocale): string {
  return translate(locale, `sessao.metodoDesc.${metodo}`);
}
