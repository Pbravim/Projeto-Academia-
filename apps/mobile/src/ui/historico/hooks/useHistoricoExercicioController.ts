import { useEffect, useState } from 'react';

import type { GetHistoricoExercicioUseCase } from '../../../application/historico/use-cases/GetHistoricoExercicioUseCase';
import type { ExecucaoExercicio } from '../../../domain/historico/repositories/HistoricoRepository';
import type { AppLogger } from '../../../infrastructure/logging/AppLogger';
import { translate, useLocale } from '../../shared/i18n';
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
  /** Erro de load — sem ele a tela caía no empty state "sem histórico" (P2 rodada 3). */
  errorMessage: string | null;
  onRetry: () => Promise<void>;
  onBack: () => void;
}

export function useHistoricoExercicioController(
  exercicioId: string,
  exercicioNome: string,
  dependencies: HistoricoExercicioControllerDependencies,
  onBack: () => void
): HistoricoExercicioControllerState {
  const locale = useLocale();
  const [execucoes, setExecucoes] = useState<ExecucaoExercicio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load é recriada a cada render; este efeito deve recarregar só quando o exercício muda
  }, [exercicioId]);

  const load = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await dependencies.getHistoricoExercicio.execute(exercicioId);
      setExecucoes(data);
    } catch (error) {
      dependencies.logger.error('historico_exercicio.load_failed', error);
      setErrorMessage(translate(locale, 'historico.errors.load'));
    } finally {
      setIsLoading(false);
    }
  };

  const viewModel = buildHistoricoExercicioViewModel(exercicioNome, execucoes, locale);

  return { viewModel, isLoading, errorMessage, onRetry: load, onBack };
}
