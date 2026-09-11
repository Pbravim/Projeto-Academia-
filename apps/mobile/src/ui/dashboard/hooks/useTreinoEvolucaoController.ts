import { useEffect, useState } from 'react';

import type { ExercicioEvolucao,GetTreinoEvolucaoUseCase } from '../../../application/dashboard/use-cases/GetTreinoEvolucaoUseCase';
import type { AppLogger } from '../../../infrastructure/logging/AppLogger';
import { translate, useLocale } from '../../shared/i18n';

export interface TreinoEvolucaoControllerDeps {
  getTreinoEvolucao: GetTreinoEvolucaoUseCase;
  logger: AppLogger;
}

export interface TreinoEvolucaoControllerState {
  exercicios: ExercicioEvolucao[];
  isLoading: boolean;
  errorMessage: string | null;
}

export function useTreinoEvolucaoController(
  treinoId: string,
  deps: TreinoEvolucaoControllerDeps
): TreinoEvolucaoControllerState {
  const locale = useLocale();
  const [exercicios, setExercicios] = useState<ExercicioEvolucao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setErrorMessage(null);
    deps.getTreinoEvolucao.execute(treinoId).then((result) => {
      if (!cancelled) {
        setExercicios(result);
        setIsLoading(false);
      }
    }).catch((error) => {
      if (!cancelled) {
        deps.logger.error('treino_evolucao.load_failed', error);
        setErrorMessage(translate(locale, 'dashboard.evolucao.errorLoad'));
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps é injetado uma vez por tela (DI); incluir getTreinoEvolucao/logger recarregaria a cada render sem motivo
  }, [treinoId, locale]);

  return { exercicios, isLoading, errorMessage };
}
