import { useEffect, useState } from 'react';

import { DuplicateExerciseError } from '../../../application/exercises/errors/DuplicateExerciseError';
import type { CreateExerciseUseCase } from '../../../application/exercises/use-cases/CreateExerciseUseCase';
import type { ListExercisesUseCase } from '../../../application/exercises/use-cases/ListExercisesUseCase';
import { DuplicateTreinoError } from '../../../application/treinos/errors/DuplicateTreinoError';
import { ExercicioJaNoTreinoError } from '../../../application/treinos/errors/ExercicioJaNoTreinoError';
import type { ConfirmarImportacaoTreinoUseCase } from '../../../application/treinos/use-cases/ConfirmarImportacaoTreinoUseCase';
import type { ImportarTreinoUseCase } from '../../../application/treinos/use-cases/ImportarTreinoUseCase';
import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import { TreinoValidationError } from '../../../domain/treinos/errors/TreinoValidationError';
import type { ItemProposta } from '../../../domain/treinos/treino-json/casarExercicios';
import { TreinoImportError, type TreinoImportErrorCode } from '../../../domain/treinos/treino-json/TreinoImportError';
import type { AppLogger } from '../../../infrastructure/logging/AppLogger';
import { translate, useLocale } from '../../shared/i18n';

export interface ItemRevisao {
  item: ItemProposta['item'];
  status: ItemProposta['status'];
  exercicioId: string | null;
  candidatos: ExercisePrimitives[];
}

export interface CriarCustomInput {
  nome: string;
  groupMuscles: string[];
  category: string;
}

export interface UseImportarTreinoControllerDependencies {
  importarTreino: ImportarTreinoUseCase;
  confirmarImportacao: ConfirmarImportacaoTreinoUseCase;
  createExercise: CreateExerciseUseCase;
  listExercises: ListExercisesUseCase;
  lerArquivoTexto: () => Promise<string | null>;
  logger: AppLogger;
}

export interface ImportarTreinoControllerState {
  texto: string;
  etapa: 'entrada' | 'revisao';
  itens: ItemRevisao[];
  catalogo: ExercisePrimitives[];
  errorMessage: string | null;
  isAnalisando: boolean;
  isSalvando: boolean;
  podeSalvar: boolean;
  onChangeTexto: (texto: string) => void;
  escolherArquivo: () => Promise<void>;
  analisar: () => Promise<void>;
  resolverItem: (index: number, exercicioId: string) => void;
  criarCustom: (index: number, input: CriarCustomInput) => Promise<void>;
  salvar: () => Promise<void>;
}

const ERROR_CODE_TO_KEY: Record<TreinoImportErrorCode, string> = {
  json_invalido: 'treinos.importar.erros.json_invalido',
  schema_ausente: 'treinos.importar.erros.schema_ausente',
  schema_desconhecido: 'treinos.importar.erros.schema_desconhecido',
  nome_invalido: 'treinos.importar.erros.nome_invalido',
  exercicios_vazios: 'treinos.importar.erros.exercicios_vazios',
  exercicio_invalido: 'treinos.importar.erros.exercicio_invalido',
};

export function useImportarTreinoController(
  dependencies: UseImportarTreinoControllerDependencies,
  onImportado: (treino: TreinoPrimitives) => void,
): ImportarTreinoControllerState {
  const locale = useLocale();
  const [texto, setTexto] = useState('');
  const [etapa, setEtapa] = useState<'entrada' | 'revisao'>('entrada');
  const [itens, setItens] = useState<ItemRevisao[]>([]);
  const [nome, setNome] = useState('');
  const [objetivo, setObjetivo] = useState<string | null>(null);
  const [catalogo, setCatalogo] = useState<ExercisePrimitives[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAnalisando, setIsAnalisando] = useState(false);
  const [isSalvando, setIsSalvando] = useState(false);

  useEffect(() => {
    void dependencies.listExercises.execute().then(setCatalogo);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carrega o catalogo só na montagem
  }, []);

  const onChangeTexto = (novoTexto: string) => {
    setTexto(novoTexto);
    if (errorMessage) setErrorMessage(null);
  };

  const escolherArquivo = async () => {
    try {
      const conteudo = await dependencies.lerArquivoTexto();
      if (conteudo === null) return;
      onChangeTexto(conteudo);
    } catch (error) {
      dependencies.logger.error('treino_importar.ler_arquivo_failed', error);
      setErrorMessage(translate(locale, 'treinos.importar.erros.leitura'));
    }
  };

  const analisar = async () => {
    if (texto.trim().length === 0) {
      setErrorMessage(translate(locale, 'treinos.importar.erros.vazio'));
      return;
    }

    setIsAnalisando(true);
    setErrorMessage(null);
    try {
      const proposta = await dependencies.importarTreino.execute(texto);
      setNome(proposta.nome);
      setObjetivo(proposta.objetivo);
      setItens(
        proposta.itens.map((it) => ({
          item: it.item,
          status: it.status,
          exercicioId: it.status === 'casado' ? it.exercicio.id : null,
          candidatos: it.candidatos,
        }))
      );
      setEtapa('revisao');
    } catch (error) {
      dependencies.logger.error('treino_importar.analisar_failed', error);
      if (error instanceof TreinoImportError) {
        setErrorMessage(translate(locale, ERROR_CODE_TO_KEY[error.code]));
      } else {
        setErrorMessage(translate(locale, 'treinos.importar.erros.leitura'));
      }
    } finally {
      setIsAnalisando(false);
    }
  };

  const resolverItem = (index: number, exercicioId: string) => {
    setItens((prev) => prev.map((it, i) => (i === index ? { ...it, exercicioId } : it)));
  };

  const criarCustom = async (index: number, input: CriarCustomInput) => {
    try {
      const created = await dependencies.createExercise.execute({
        name: input.nome,
        groupMuscles: input.groupMuscles,
        category: input.category,
      });
      setCatalogo((prev) => [...prev, created]);
      resolverItem(index, created.id);
    } catch (error) {
      dependencies.logger.error('treino_importar.criar_custom_failed', error);
      if (error instanceof DuplicateExerciseError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(translate(locale, 'treinos.importar.erros.salvar'));
      }
    }
  };

  const podeSalvar = itens.length > 0 && itens.every((it) => it.exercicioId !== null);

  const salvar = async () => {
    if (!podeSalvar) return;

    setIsSalvando(true);
    setErrorMessage(null);
    try {
      const treino = await dependencies.confirmarImportacao.execute({
        nome,
        objetivo,
        itens: itens.map((it) => ({ item: it.item, exercicioId: it.exercicioId! })),
      });
      onImportado(treino);
    } catch (error) {
      dependencies.logger.error('treino_importar.salvar_failed', error);
      if (error instanceof TreinoValidationError || error instanceof DuplicateTreinoError) {
        setErrorMessage(error.message);
      } else if (error instanceof ExercicioJaNoTreinoError) {
        setErrorMessage(translate(locale, 'treinos.importar.erros.exercicio_repetido'));
      } else {
        setErrorMessage(translate(locale, 'treinos.importar.erros.salvar'));
      }
    } finally {
      setIsSalvando(false);
    }
  };

  return {
    texto,
    etapa,
    itens,
    catalogo,
    errorMessage,
    isAnalisando,
    isSalvando,
    podeSalvar,
    onChangeTexto,
    escolherArquivo,
    analisar,
    resolverItem,
    criarCustom,
    salvar,
  };
}
