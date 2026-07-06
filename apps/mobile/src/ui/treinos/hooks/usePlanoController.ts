import { useEffect, useState } from 'react';

import type { GetPlanoSemanalUseCase } from '../../../application/plano/use-cases/GetPlanoSemanalUseCase';
import type { SetDiaPlanoUseCase } from '../../../application/plano/use-cases/SetDiaPlanoUseCase';
import type { DiaSemana } from '../../../domain/plano/entities/DiaSemana';
import { DIAS_SEMANA } from '../../../domain/plano/entities/DiaSemana';
import type { PlanoSemanal } from '../../../domain/plano/repositories/PlanoSemanalRepository';
import { translate, useLocale } from '../../shared/i18n';

export interface PlanoControllerDependencies {
  getPlanoSemanal: GetPlanoSemanalUseCase;
  setDiaPlano: SetDiaPlanoUseCase;
}

export interface PlanoControllerState {
  plano: PlanoSemanal;
  diaSelecionado: DiaSemana | null;
  isLoading: boolean;
  errorMessage: string | null;
  onSelectDia: (dia: DiaSemana) => void;
  onSetTreino: (treinoId: string | null) => Promise<void>;
  onClosePicker: () => void;
  reload: () => Promise<void>;
}

const emptyPlano: PlanoSemanal = Object.fromEntries(DIAS_SEMANA.map((d) => [d, null])) as PlanoSemanal;

export function usePlanoController(deps: PlanoControllerDependencies): PlanoControllerState {
  const locale = useLocale();
  const [plano, setPlano] = useState<PlanoSemanal>(emptyPlano);
  const [diaSelecionado, setDiaSelecionado] = useState<DiaSemana | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reload = async () => {
    setIsLoading(true);
    try {
      const result = await deps.getPlanoSemanal.execute();
      setPlano(result);
    } catch {
      setErrorMessage(translate(locale, 'treinos.plano.errors.load'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void reload(); }, []);

  const onSelectDia = (dia: DiaSemana) => setDiaSelecionado(dia);

  const onSetTreino = async (treinoId: string | null) => {
    if (!diaSelecionado) return;
    const prev = plano;
    setPlano((p) => ({ ...p, [diaSelecionado]: treinoId }));
    setDiaSelecionado(null);
    try {
      await deps.setDiaPlano.execute(diaSelecionado, treinoId);
    } catch {
      setPlano(prev);
      setErrorMessage(translate(locale, 'treinos.plano.errors.save'));
    }
  };

  const onClosePicker = () => setDiaSelecionado(null);

  return { plano, diaSelecionado, isLoading, errorMessage, onSelectDia, onSetTreino, onClosePicker, reload };
}
