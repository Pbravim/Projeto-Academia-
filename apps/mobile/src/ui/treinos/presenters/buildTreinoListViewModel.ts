import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import type { AppLocale } from '../../shared/i18n';
import { translate } from '../../shared/i18n/core';

export interface TreinoCardViewModel {
  id: string;
  title: string;
  subtitle: string;
}

export interface TreinoListViewModel {
  cards: TreinoCardViewModel[];
  emptyStateMessage: string | null;
}

export function buildTreinoListViewModel(treinos: TreinoPrimitives[], locale: AppLocale = 'pt-BR'): TreinoListViewModel {
  if (treinos.length === 0) {
    return {
      cards: [],
      emptyStateMessage: translate(locale, 'treinos.list.emptyStateMessage'),
    };
  }

  return {
    cards: treinos.map((t) => ({
      id: t.id,
      title: t.name,
      subtitle: t.objetivo ?? translate(locale, 'treinos.semObjetivoDefinido'),
    })),
    emptyStateMessage: null,
  };
}
