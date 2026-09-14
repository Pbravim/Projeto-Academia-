import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';
import { casarExercicios, type PropostaImportacao } from '../../../domain/treinos/treino-json/casarExercicios';
import { parseTreinoJson } from '../../../domain/treinos/treino-json/parseTreinoJson';

interface ImportarTreinoUseCaseDependencies {
  exerciseRepository: ExerciseRepository;
}

/** Faz o parse de um JSON de treino e propõe o casamento com o catálogo. Leitura pura — não salva nada. */
export class ImportarTreinoUseCase {
  constructor(private readonly dependencies: ImportarTreinoUseCaseDependencies) {}

  /** @throws {TreinoImportError} JSON invalido, schema desconhecido ou campo invalido */
  async execute(text: string): Promise<PropostaImportacao> {
    const resultado = parseTreinoJson(text);
    if (!resultado.ok) {
      throw resultado.error;
    }

    const catalogo = await this.dependencies.exerciseRepository.list();
    const itens = casarExercicios(
      resultado.treino.exercicios,
      catalogo.map((exercise) => exercise.toPrimitives())
    );

    return { nome: resultado.treino.nome, objetivo: resultado.treino.objetivo, itens };
  }
}
