import type { TransactionPort } from '../../../domain/shared/ports/TransactionPort';
import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import { TreinoExercicio } from '../../../domain/treinos/entities/TreinoExercicio';
import type { TreinoExercicioRepository } from '../../../domain/treinos/repositories/TreinoExercicioRepository';
import type { TreinoJsonExercicioV1 } from '../../../domain/treinos/treino-json/TreinoJsonSchema';

import type { CreateTreinoUseCase } from './CreateTreinoUseCase';

export interface ImportacaoResolvidaItem {
  item: TreinoJsonExercicioV1;
  exercicioId: string;
}

export interface ImportacaoResolvida {
  nome: string;
  objetivo?: string | null;
  itens: ImportacaoResolvidaItem[];
}

interface ConfirmarImportacaoTreinoUseCaseDependencies {
  createTreino: CreateTreinoUseCase;
  treinoExercicioRepository: TreinoExercicioRepository;
  idGenerator: () => string;
  gerarGrupoId: () => string;
  database?: TransactionPort;
}

/** Cria o Treino + TreinoExercicio a partir de uma proposta de importação já resolvida (todo item com exercicioId). */
export class ConfirmarImportacaoTreinoUseCase {
  constructor(private readonly deps: ConfirmarImportacaoTreinoUseCaseDependencies) {}

  /** @throws {DuplicateTreinoError} ja existe treino com o mesmo nome */
  async execute(proposta: ImportacaoResolvida): Promise<TreinoPrimitives> {
    if (this.deps.database) {
      return this.deps.database.withTransaction(() => this.salvar(proposta));
    }
    return this.salvar(proposta);
  }

  private async salvar(proposta: ImportacaoResolvida): Promise<TreinoPrimitives> {
    const treino = await this.deps.createTreino.execute({ name: proposta.nome, objetivo: proposta.objetivo ?? undefined });

    const contagemPorLetra = this.contarPorLetra(proposta.itens);
    const grupoIdPorLetra = new Map<string, string>();

    let ordem = 1;
    for (const { item, exercicioId } of proposta.itens) {
      const grupoId = this.resolverGrupoId(item.grupo, contagemPorLetra, grupoIdPorLetra);
      const treinoExercicio = TreinoExercicio.create({
        id: this.deps.idGenerator(),
        treinoId: treino.id,
        exercicioId,
        ordem: ordem++,
        seriesRecomendadas: item.seriesAlvo ?? null,
        execucoesRecomendadas: item.repsAlvo ?? null,
        cargaPadrao: null,
        tempoDescansoSegundos: item.descansoSegundos ?? null,
        metodo: item.metodo,
        grupoId,
        duracaoRecomendadaSegundos: item.duracaoSegundos ?? null,
        distanciaRecomendadaMetros: item.distanciaMetros ?? null,
        intensidadeRecomendada: item.intensidade ?? null,
      });
      await this.deps.treinoExercicioRepository.save(treinoExercicio);
    }

    return treino;
  }

  private contarPorLetra(itens: ImportacaoResolvidaItem[]): Map<string, number> {
    const contagem = new Map<string, number>();
    for (const { item } of itens) {
      if (item.grupo) contagem.set(item.grupo, (contagem.get(item.grupo) ?? 0) + 1);
    }
    return contagem;
  }

  private resolverGrupoId(
    grupo: string | undefined,
    contagemPorLetra: Map<string, number>,
    grupoIdPorLetra: Map<string, string>
  ): string | null {
    if (!grupo || (contagemPorLetra.get(grupo) ?? 0) < 2) return null;

    const existente = grupoIdPorLetra.get(grupo);
    if (existente) return existente;

    const novo = this.deps.gerarGrupoId();
    grupoIdPorLetra.set(grupo, novo);
    return novo;
  }
}
