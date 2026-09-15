import type { SerieRegistradaRepository } from '../../../domain/sessoes/repositories/SerieRegistradaRepository';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import type { TreinoExercicioRepository } from '../../../domain/treinos/repositories/TreinoExercicioRepository';
import type { TreinoRepository } from '../../../domain/treinos/repositories/TreinoRepository';

export type DecisaoFinalizacao =
  | { tipo: 'nenhuma' }
  | { tipo: 'salvar_como_treino'; nomeAtual: string; totalExercicios: number }
  | {
      tipo: 'adicionar_ao_treino';
      treinoId: string;
      treinoNome: string;
      avulsos: Array<{ sessaoExercicioId: string; exercicioId: string; nome: string; seriesValidas: number }>;
    };

interface GetDecisaoFinalizacaoUseCaseDependencies {
  sessaoTreinoRepository: SessaoTreinoRepository;
  sessaoExercicioRepository: SessaoExercicioRepository;
  treinoRepository: TreinoRepository;
  treinoExercicioRepository: TreinoExercicioRepository;
  serieRegistradaRepository: SerieRegistradaRepository;
}

/**
 * Calcula, apos a sessao finalizada, qual oferta a UI deve fazer ao aluno (D6):
 * sessao livre com exercicios -> oferecer salvar como treino; sessao de treino com
 * exercicios avulsos (D7) -> oferecer adicionar em lote ao template. Leitura pura,
 * nao muda nenhum estado.
 */
export class GetDecisaoFinalizacaoUseCase {
  constructor(private readonly dependencies: GetDecisaoFinalizacaoUseCaseDependencies) {}

  async execute(sessaoId: string): Promise<DecisaoFinalizacao> {
    const sessao = await this.dependencies.sessaoTreinoRepository.findById(sessaoId);
    if (!sessao) return { tipo: 'nenhuma' };

    const { treinoId, treinoNomeSnapshot } = sessao.toPrimitives();

    if (treinoId === null) {
      const total = await this.dependencies.sessaoExercicioRepository.countBySessaoId(sessaoId);
      if (total === 0) return { tipo: 'nenhuma' };
      return { tipo: 'salvar_como_treino', nomeAtual: treinoNomeSnapshot, totalExercicios: total };
    }

    const treino = await this.dependencies.treinoRepository.findById(treinoId);
    if (!treino) return { tipo: 'nenhuma' };

    const templateExercicios = await this.dependencies.treinoExercicioRepository.listByTreinoId(treinoId);
    const templateExercicioIds = new Set(templateExercicios.map((te) => te.toPrimitives().exercicioId));

    const sessaoExercicios = await this.dependencies.sessaoExercicioRepository.listBySessaoId(sessaoId);
    const avulsosSe = sessaoExercicios.filter((se) => {
      const p = se.toPrimitives();
      return p.substituidoPorExercicioId === null && !templateExercicioIds.has(p.exercicioId);
    });

    if (avulsosSe.length === 0) return { tipo: 'nenhuma' };

    const series = await this.dependencies.serieRegistradaRepository.listBySessaoExercicioIds(
      avulsosSe.map((se) => se.toPrimitives().id)
    );
    const seriesValidasPorSessaoExercicioId = new Map<string, number>();
    for (const serie of series) {
      const p = serie.toPrimitives();
      if (p.tipoSerie !== 'valida') continue;
      seriesValidasPorSessaoExercicioId.set(
        p.sessaoExercicioId,
        (seriesValidasPorSessaoExercicioId.get(p.sessaoExercicioId) ?? 0) + 1
      );
    }

    const avulsos = avulsosSe.map((se) => {
      const p = se.toPrimitives();
      return {
        sessaoExercicioId: p.id,
        exercicioId: p.exercicioId,
        nome: p.nomeSnapshot,
        seriesValidas: seriesValidasPorSessaoExercicioId.get(p.id) ?? 0,
      };
    });

    return { tipo: 'adicionar_ao_treino', treinoId, treinoNome: treino.toPrimitives().name, avulsos };
  }
}
