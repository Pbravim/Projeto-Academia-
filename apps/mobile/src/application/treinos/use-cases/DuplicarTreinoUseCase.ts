import { Treino, type TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import { TreinoExercicio } from '../../../domain/treinos/entities/TreinoExercicio';
import type { TreinoRepository } from '../../../domain/treinos/repositories/TreinoRepository';
import type { TreinoExercicioRepository } from '../../../domain/treinos/repositories/TreinoExercicioRepository';
import type { TransactionPort } from '../../../domain/shared/ports/TransactionPort';
import { TreinoNotFoundError } from '../errors/TreinoNotFoundError';

interface DuplicarTreinoDependencies {
  treinoRepository: TreinoRepository;
  treinoExercicioRepository: TreinoExercicioRepository;
  idGenerator: () => string;
  now: () => Date;
  database?: TransactionPort;
}

/** Cria uma cópia de um treino existente com todos os seus exercícios e recomendações. */
export class DuplicarTreinoUseCase {
  constructor(private readonly deps: DuplicarTreinoDependencies) {}

  /**
   * @throws {TreinoNotFoundError} treino original não encontrado
   * @throws {TreinoValidationError} nome inválido (não deve ocorrer — gerado automaticamente)
   */
  async execute(treinoId: string): Promise<TreinoPrimitives> {
    const original = await this.deps.treinoRepository.findById(treinoId);
    if (!original) throw new TreinoNotFoundError(treinoId);

    const duplicateOperation = async () => {
      const prim = original.toPrimitives();
      const existingTreinos = await this.deps.treinoRepository.list();
      const existingNames = new Set(existingTreinos.map((t) => t.toPrimitives().name.trim().toLowerCase()));

      let novoNome = `Copia de ${prim.name}`;
      let counter = 2;
      while (existingNames.has(novoNome.trim().toLowerCase())) {
        novoNome = `Copia de ${prim.name} (${counter++})`;
      }

      const copia = Treino.create({
        id: this.deps.idGenerator(),
        name: novoNome,
        objetivo: prim.objetivo,
        createdAt: this.deps.now(),
      });
      await this.deps.treinoRepository.save(copia);

      const exercicios = await this.deps.treinoExercicioRepository.listByTreinoId(treinoId);
      for (const te of exercicios) {
        const ep = te.toPrimitives();
        const teNovo = TreinoExercicio.create({
          id: this.deps.idGenerator(),
          treinoId: copia.toPrimitives().id,
          exercicioId: ep.exercicioId,
          ordem: ep.ordem,
          seriesRecomendadas: ep.seriesRecomendadas,
          execucoesRecomendadas: ep.execucoesRecomendadas,
          cargaPadrao: ep.cargaPadrao,
          tempoDescansoSegundos: ep.tempoDescansoSegundos,
          metodo: ep.metodo,
          grupoId: ep.grupoId,
          duracaoRecomendadaSegundos: ep.duracaoRecomendadaSegundos,
          distanciaRecomendadaMetros: ep.distanciaRecomendadaMetros,
          intensidadeRecomendada: ep.intensidadeRecomendada,
        });
        await this.deps.treinoExercicioRepository.save(teNovo);
      }

      return copia.toPrimitives();
    };

    if (this.deps.database) {
      return await this.deps.database.withTransaction(duplicateOperation);
    } else {
      return await duplicateOperation();
    }
  }
}
