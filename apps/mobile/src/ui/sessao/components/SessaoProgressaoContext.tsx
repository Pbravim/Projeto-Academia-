import { createContext, type ReactNode, useMemo } from 'react';

import type { GetHistoricoAnteriorDaSessaoUseCase } from '../../../application/historico/use-cases/GetHistoricoAnteriorDaSessaoUseCase';
import type { SessaoDetalhe } from '../../../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import type { ExecucaoExercicio } from '../../../domain/historico/repositories/HistoricoRepository';
import { useHistoricoAnteriorDaSessao } from '../hooks/useHistoricoAnteriorDaSessao';

export const SessaoProgressaoContext = createContext<ReadonlyMap<string, ExecucaoExercicio[]> | null>(null);

export function SessaoProgressaoProvider({ detalhe, useCase, children }: {
  detalhe: SessaoDetalhe | null; useCase?: GetHistoricoAnteriorDaSessaoUseCase; children: ReactNode;
}) {
  const { historico } = useHistoricoAnteriorDaSessao(detalhe, useCase);
  const porSessaoExercicio = useMemo(() => {
    if (!historico || !detalhe) return null;
    return new Map(detalhe.exercicios.map(({ sessaoExercicio: se }) => [se.id, historico.get(se.exercicioId) ?? []]));
  }, [detalhe, historico]);
  return <SessaoProgressaoContext.Provider value={porSessaoExercicio}>{children}</SessaoProgressaoContext.Provider>;
}
