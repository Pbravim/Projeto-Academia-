import { useEffect, useState } from 'react';

import type { GetPlanoSemanalUseCase } from '../../../application/plano/use-cases/GetPlanoSemanalUseCase';
import type { SetDiaPlanoUseCase } from '../../../application/plano/use-cases/SetDiaPlanoUseCase';
import type { DiaSemana } from '../../../domain/plano/entities/DiaSemana';
import { DIAS_SEMANA } from '../../../domain/plano/entities/DiaSemana';
import type { PlanoSemanal } from '../../../domain/plano/repositories/PlanoSemanalRepository';

export interface PlanoControllerDependencies {
  getPlanoSemanal: GetPlanoSemanalUseCase;
  setDiaPlano: SetDiaPlanoUseCase;
}

export interface PlanoControllerState {
  plano: PlanoSemanal;
  diaSelecionado: DiaSemana | null;
  onSelectDia: (dia: DiaSemana) => void;
  onSetTreino: (treinoId: string | null) => Promise<void>;
  onClosePicker: () => void;
}

const emptyPlano: PlanoSemanal = Object.fromEntries(DIAS_SEMANA.map((d) => [d, null])) as PlanoSemanal;

export function usePlanoController(deps: PlanoControllerDependencies): PlanoControllerState {
  const [plano, setPlano] = useState<PlanoSemanal>(emptyPlano);
  const [diaSelecionado, setDiaSelecionado] = useState<DiaSemana | null>(null);

  useEffect(() => {
    void deps.getPlanoSemanal.execute().then(setPlano);
  }, []);

  const onSelectDia = (dia: DiaSemana) => setDiaSelecionado(dia);

  const onSetTreino = async (treinoId: string | null) => {
    if (!diaSelecionado) return;
    await deps.setDiaPlano.execute(diaSelecionado, treinoId);
    setPlano((prev) => ({ ...prev, [diaSelecionado]: treinoId }));
    setDiaSelecionado(null);
  };

  const onClosePicker = () => setDiaSelecionado(null);

  return { plano, diaSelecionado, onSelectDia, onSetTreino, onClosePicker };
}
