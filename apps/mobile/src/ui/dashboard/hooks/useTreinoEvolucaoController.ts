import { useEffect, useState } from 'react';

import type { GetTreinoEvolucaoUseCase, ExercicioEvolucao } from '../../../application/dashboard/use-cases/GetTreinoEvolucaoUseCase';
import type { AppLogger } from '../../../infrastructure/logging/AppLogger';

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
        setErrorMessage('Nao foi possivel carregar a evolucao do treino.');
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [treinoId]);

  return { exercicios, isLoading, errorMessage };
}
