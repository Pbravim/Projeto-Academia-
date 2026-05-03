import { useEffect, useState } from 'react';

import type { GetHistoricoExercicioUseCase } from '../../../application/historico/use-cases/GetHistoricoExercicioUseCase';
import type { ExecucaoExercicio } from '../../../domain/historico/repositories/HistoricoRepository';
import type { AppLogger } from '../../../infrastructure/logging/AppLogger';
import {
  buildHistoricoExercicioViewModel,
  type HistoricoExercicioViewModel,
} from '../presenters/buildHistoricoExercicioViewModel';

export interface HistoricoExercicioControllerDependencies {
  getHistoricoExercicio: GetHistoricoExercicioUseCase;
  logger: AppLogger;
}

export interface HistoricoExercicioControllerState {
  viewModel: HistoricoExercicioViewModel;
  isLoading: boolean;
  onBack: () => void;
}

export function useHistoricoExercicioController(
  exercicioId: string,
  exercicioNome: string,
  dependencies: HistoricoExercicioControllerDependencies,
  onBack: () => void
): HistoricoExercicioControllerState {
  const [execucoes, setExecucoes] = useState<ExecucaoExercicio[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void load();
  }, [exercicioId]);

  const load = async () => {
    try {
      setIsLoading(true);
      const data = await dependencies.getHistoricoExercicio.execute(exercicioId);
      setExecucoes(data);
    } catch (error) {
      dependencies.logger.error('historico_exercicio.load_failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  const viewModel = buildHistoricoExercicioViewModel(exercicioNome, execucoes);

  return { viewModel, isLoading, onBack };
}
