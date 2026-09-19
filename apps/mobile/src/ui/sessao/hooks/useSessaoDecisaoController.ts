import { useState } from 'react';

import type { AdicionarExerciciosAoTreinoUseCase } from '../../../application/sessoes/use-cases/AdicionarExerciciosAoTreinoUseCase';
import type { DecisaoFinalizacao } from '../../../application/sessoes/use-cases/GetDecisaoFinalizacaoUseCase';
import type { SalvarSessaoComoTreinoUseCase } from '../../../application/sessoes/use-cases/SalvarSessaoComoTreinoUseCase';
import { DuplicateTreinoError } from '../../../application/treinos/errors/DuplicateTreinoError';
import type { AppLogger } from '../../../infrastructure/logging/AppLogger';
import { translate, useLocale } from '../../shared/i18n';

export interface SessaoDecisaoControllerDependencies {
  salvarSessaoComoTreino: SalvarSessaoComoTreinoUseCase;
  adicionarExerciciosAoTreino: AdicionarExerciciosAoTreinoUseCase;
  logger: AppLogger;
}

export interface SessaoDecisaoControllerState {
  nome: string;
  selecionados: Set<string>;
  isSalvando: boolean;
  errorMessage: string | null;
  onChangeNome: (nome: string) => void;
  onToggleSelecionado: (sessaoExercicioId: string) => void;
  onSalvarComoTreino: () => Promise<void>;
  onAdicionarSelecionados: () => Promise<void>;
  onIgnorar: () => void;
}

function nomeInicial(decisao: DecisaoFinalizacao): string {
  return decisao.tipo === 'salvar_como_treino' ? decisao.nomeAtual : '';
}

function selecionadosIniciais(decisao: DecisaoFinalizacao): Set<string> {
  return decisao.tipo === 'adicionar_ao_treino'
    ? new Set(decisao.avulsos.map((a) => a.sessaoExercicioId))
    : new Set();
}

/**
 * Controller da etapa de decisao (D6/D10): estado de UI puro (nome digitado,
 * selecao em lote) + as duas acoes que a tela oferece. Nao guarda nada em
 * kv-store — se o app morrer aqui, a sessao ja esta finalizada (D10).
 */
export function useSessaoDecisaoController(
  sessaoId: string,
  decisao: DecisaoFinalizacao,
  dependencies: SessaoDecisaoControllerDependencies,
  onConcluido: () => void,
): SessaoDecisaoControllerState {
  const locale = useLocale();
  const [nome, setNome] = useState(() => nomeInicial(decisao));
  const [selecionados, setSelecionados] = useState<Set<string>>(() => selecionadosIniciais(decisao));
  const [isSalvando, setIsSalvando] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onChangeNome = (novoNome: string) => setNome(novoNome);

  const onToggleSelecionado = (sessaoExercicioId: string) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(sessaoExercicioId)) {
        next.delete(sessaoExercicioId);
      } else {
        next.add(sessaoExercicioId);
      }
      return next;
    });
  };

  const onSalvarComoTreino = async () => {
    setIsSalvando(true);
    setErrorMessage(null);
    try {
      await dependencies.salvarSessaoComoTreino.execute({ sessaoId, nome });
      onConcluido();
    } catch (error) {
      dependencies.logger.error('sessao_decisao.salvar_failed', error);
      if (error instanceof DuplicateTreinoError) {
        setErrorMessage(translate(locale, 'sessao.decisao.nomeDuplicado'));
      } else {
        setErrorMessage(translate(locale, 'sessao.errors.decisao'));
      }
    } finally {
      setIsSalvando(false);
    }
  };

  const onAdicionarSelecionados = async () => {
    setIsSalvando(true);
    setErrorMessage(null);
    try {
      // `selecionados` guarda sessaoExercicioId (chave estavel do checkbox na UI),
      // mas o use case espera exercicioId (id do catalogo) — mapear na hora de
      // chamar, nunca enviar o id de sessao direto (achado 1, sev3, #58).
      const exercicioIds = decisao.tipo === 'adicionar_ao_treino'
        ? decisao.avulsos.filter((a) => selecionados.has(a.sessaoExercicioId)).map((a) => a.exercicioId)
        : [];
      await dependencies.adicionarExerciciosAoTreino.execute({
        sessaoId,
        exercicioIds,
      });
      onConcluido();
    } catch (error) {
      dependencies.logger.error('sessao_decisao.adicionar_failed', error);
      setErrorMessage(translate(locale, 'sessao.errors.decisao'));
    } finally {
      setIsSalvando(false);
    }
  };

  const onIgnorar = () => onConcluido();

  return {
    nome,
    selecionados,
    isSalvando,
    errorMessage,
    onChangeNome,
    onToggleSelecionado,
    onSalvarComoTreino,
    onAdicionarSelecionados,
    onIgnorar,
  };
}
