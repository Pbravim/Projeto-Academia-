import { startTransition, useEffect, useState } from 'react';

import type { DeleteRegistroPesoUseCase } from '../../../application/peso/use-cases/DeleteRegistroPesoUseCase';
import type { ListRegistrosPesoUseCase } from '../../../application/peso/use-cases/ListRegistrosPesoUseCase';
import type { RegistrarPesoUseCase } from '../../../application/peso/use-cases/RegistrarPesoUseCase';
import type { RegistroPesoPrimitives } from '../../../domain/peso/entities/RegistroPeso';
import { PesoValidationError } from '../../../domain/peso/errors/PesoValidationError';
import type { AppLogger } from '../../../infrastructure/logging/AppLogger';
import { buildPesoViewModel, type PesoViewModel } from '../presenters/buildPesoViewModel';

export interface PesoControllerDependencies {
  registrarPeso: RegistrarPesoUseCase;
  listRegistrosPeso: ListRegistrosPesoUseCase;
  deleteRegistroPeso: DeleteRegistroPesoUseCase;
  logger: AppLogger;
}

export interface PesoControllerState {
  viewModel: PesoViewModel;
  pesoKgInput: string;
  observacaoInput: string;
  errorMessage: string | null;
  feedbackMessage: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  onChangePesoKg: (value: string) => void;
  onChangeObservacao: (value: string) => void;
  onSubmit: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function usePesoController(dependencies: PesoControllerDependencies): PesoControllerState {
  const [registros, setRegistros] = useState<RegistroPesoPrimitives[]>([]);
  const [pesoKgInput, setPesoKgInput] = useState('');
  const [observacaoInput, setObservacaoInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRegistros = async () => {
    try {
      const lista = await dependencies.listRegistrosPeso.execute();
      startTransition(() => setRegistros(lista));
    } catch (error) {
      dependencies.logger.error('peso.load_failed', error);
      setErrorMessage('Nao foi possivel carregar os registros.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRegistros();
  }, []);

  const onChangePesoKg = (value: string) => {
    setPesoKgInput(value);
    if (errorMessage) setErrorMessage(null);
    if (feedbackMessage) setFeedbackMessage(null);
  };

  const onChangeObservacao = (value: string) => {
    setObservacaoInput(value);
  };

  const onSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      const pesoKg = parseFloat(pesoKgInput.replace(',', '.'));
      await dependencies.registrarPeso.execute({ pesoKg, observacao: observacaoInput || undefined });
      setPesoKgInput('');
      setObservacaoInput('');
      setFeedbackMessage('Peso registrado com sucesso.');
      await loadRegistros();
    } catch (error) {
      dependencies.logger.error('peso.submit_failed', error);
      if (error instanceof PesoValidationError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Nao foi possivel salvar o registro.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      await dependencies.deleteRegistroPeso.execute(id);
      setFeedbackMessage('Registro excluido.');
      await loadRegistros();
    } catch (error) {
      dependencies.logger.error('peso.delete_failed', error, { id });
      setErrorMessage('Nao foi possivel excluir o registro.');
    }
  };

  const viewModel = buildPesoViewModel(registros);

  return {
    viewModel,
    pesoKgInput,
    observacaoInput,
    errorMessage,
    feedbackMessage,
    isLoading,
    isSubmitting,
    onChangePesoKg,
    onChangeObservacao,
    onSubmit,
    onDelete,
  };
}
