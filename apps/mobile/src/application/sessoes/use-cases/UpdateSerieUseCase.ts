import { SerieRegistrada } from '../../../domain/sessoes/entities/SerieRegistrada';
import type { SerieRegistradaRepository } from '../../../domain/sessoes/repositories/SerieRegistradaRepository';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import { SessaoEncerradaError } from '../errors/SessaoEncerradaError';

export interface UpdateSerieInput {
  serieId: string;
  cargaKg: number;
  repeticoes: number;
  observacao?: string | null;
}

interface Deps {
  serieRegistradaRepository: SerieRegistradaRepository;
  sessaoExercicioRepository: SessaoExercicioRepository;
  sessaoTreinoRepository: SessaoTreinoRepository;
}

export class UpdateSerieUseCase {
  constructor(private readonly deps: Deps) {}

  async execute(input: UpdateSerieInput): Promise<void> {
    const serie = await this.deps.serieRegistradaRepository.findById(input.serieId);
    if (!serie) return;

    SerieRegistrada.create({
      id: serie.toPrimitives().id,
      sessaoExercicioId: serie.toPrimitives().sessaoExercicioId,
      ordem: serie.toPrimitives().ordem,
      cargaKg: input.cargaKg,
      repeticoes: input.repeticoes,
      observacao: input.observacao ?? undefined,
    });

    const se = await this.deps.sessaoExercicioRepository.findById(serie.toPrimitives().sessaoExercicioId);
    if (!se) return;

    const sessao = await this.deps.sessaoTreinoRepository.findById(se.toPrimitives().sessaoTreinoId);
    if (!sessao?.isAtiva()) throw new SessaoEncerradaError();

    await this.deps.serieRegistradaRepository.update(input.serieId, {
      cargaKg: input.cargaKg,
      repeticoes: input.repeticoes,
      observacao: input.observacao ?? null,
    });
  }
}
