import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';

export interface TreinoCardViewModel {
  id: string;
  title: string;
  subtitle: string;
}

export interface TreinoListViewModel {
  cards: TreinoCardViewModel[];
  emptyStateMessage: string | null;
}

export function buildTreinoListViewModel(treinos: TreinoPrimitives[]): TreinoListViewModel {
  if (treinos.length === 0) {
    return {
      cards: [],
      emptyStateMessage: 'Nenhum treino criado ainda. Crie o primeiro para comecar.',
    };
  }

  return {
    cards: treinos.map((t) => ({
      id: t.id,
      title: t.name,
      subtitle: t.objetivo ?? 'Sem objetivo definido',
    })),
    emptyStateMessage: null,
  };
}
