import { useEffect, useState } from 'react';

import type { GetHistoricoAnteriorDaSessaoUseCase, HistoricoAnteriorInput } from '../../../application/historico/use-cases/GetHistoricoAnteriorDaSessaoUseCase';
import type { SessaoDetalhe } from '../../../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import type { ExecucaoExercicio } from '../../../domain/historico/repositories/HistoricoRepository';

type Historico = Map<string, ExecucaoExercicio[]>;

export function useHistoricoAnteriorDaSessao(detalhe: SessaoDetalhe | null, useCase?: GetHistoricoAnteriorDaSessaoUseCase) {
  const key = detalhe?.sessao?.id ? JSON.stringify({
    sessaoId: detalhe.sessao.id, inicio: detalhe.sessao.dataHoraInicio,
    exercicioIds: [...new Set(detalhe.exercicios.map((ex) => ex.sessaoExercicio.exercicioId))].sort(),
  } satisfies HistoricoAnteriorInput) : null;
  const [state, setState] = useState<{ key: string; historico: Historico | null; failed: boolean } | null>(null);

  useEffect(() => {
    if (!key || !useCase) return undefined;
    let active = true;
    void useCase.execute(JSON.parse(key) as HistoricoAnteriorInput).then(
      (historico) => { if (active) setState({ key, historico, failed: false }); },
      () => { if (active) setState({ key, historico: null, failed: true }); },
    );
    return () => { active = false; };
  }, [key, useCase]);

  return {
    historico: state?.key === key ? state.historico : null,
    failed: state?.key === key && state.failed,
  };
}
