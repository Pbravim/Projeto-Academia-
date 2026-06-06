import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';
import type { HistoricoRepository, UltimaExecucaoValida } from '../../../domain/historico/repositories/HistoricoRepository';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import { SessaoExercicioNotFoundError } from '../errors/SessaoExercicioNotFoundError';

function splitGrupos(groupMuscle: string): string[] {
  return groupMuscle.split(',').map((g) => g.trim()).filter(Boolean);
}

function temIntersecaoDeGrupo(a: string, b: string): boolean {
  const ga = splitGrupos(a);
  const gb = new Set(splitGrupos(b));
  return ga.some((g) => gb.has(g));
}

export interface CandidatoSubstituto {
  exercicio: ExercisePrimitives;
  predefinido: boolean;
  enfaseDiferente: boolean;
  ultimaExecucao: UltimaExecucaoValida | null;
}

interface Dependencies {
  sessaoExercicioRepository: SessaoExercicioRepository;
  exerciseRepository: ExerciseRepository;
  historicoRepository: HistoricoRepository;
}

/**
 * Dado um sessaoExercicioId, retorna candidatos a substituto ordenados por relevância:
 *   1. Mesmo musculo_alvo
 *   2. Mesmo group_muscle (ênfase diferente) — marcados com enfaseDiferente: true
 * Exclui exercícios já presentes na sessão.
 */
export class SugerirSubstitutosUseCase {
  constructor(private readonly deps: Dependencies) {}

  async execute(sessaoExercicioId: string): Promise<CandidatoSubstituto[]> {
    const sessaoExercicio = await this.deps.sessaoExercicioRepository.findById(sessaoExercicioId);
    if (!sessaoExercicio) throw new SessaoExercicioNotFoundError(sessaoExercicioId);

    const p = sessaoExercicio.toPrimitives();
    const todosNaSessao = await this.deps.sessaoExercicioRepository.listBySessaoId(p.sessaoTreinoId);
    const idsNaSessao = new Set(todosNaSessao.map((se) => se.toPrimitives().exercicioId));

    const [todosExercicios, ultimasExecucoes, alternativasPredefinidas] = await Promise.all([
      this.deps.exerciseRepository.list(),
      this.deps.historicoRepository.getUltimasExecucoesValidas(),
      this.deps.exerciseRepository.listAlternativas(p.exercicioId),
    ]);

    const grupoMuscular = p.grupoMuscularSnapshot;

    const idsPredefinidos = new Set(alternativasPredefinidas.map((e) => e.toPrimitives().id));

    // Layer 0 — pre-defined substitutes
    const camada0: CandidatoSubstituto[] = alternativasPredefinidas
      .map((ex) => ex.toPrimitives())
      .filter((ep) => !idsNaSessao.has(ep.id))
      .map((ep) => ({
        exercicio: ep,
        predefinido: true,
        enfaseDiferente: false,
        ultimaExecucao: ultimasExecucoes.get(ep.id) ?? null,
      }));

    const camada1: CandidatoSubstituto[] = [];

    for (const ex of todosExercicios) {
      const ep = ex.toPrimitives();
      if (idsNaSessao.has(ep.id) || idsPredefinidos.has(ep.id)) continue;

      if (temIntersecaoDeGrupo(ep.groupMuscle, grupoMuscular)) {
        camada1.push({
          exercicio: ep,
          predefinido: false,
          enfaseDiferente: true,
          ultimaExecucao: ultimasExecucoes.get(ep.id) ?? null,
        });
      }
    }

    return [...camada0, ...camada1];
  }
}
