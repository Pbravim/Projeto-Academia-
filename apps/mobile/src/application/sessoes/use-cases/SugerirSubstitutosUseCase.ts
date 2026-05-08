import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';
import type { HistoricoRepository, UltimaExecucaoValida } from '../../../domain/historico/repositories/HistoricoRepository';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import { SessaoNotFoundError } from '../errors/SessaoNotFoundError';

export interface CandidatoSubstituto {
  exercicio: ExercisePrimitives;
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
    if (!sessaoExercicio) throw new SessaoNotFoundError(sessaoExercicioId);

    const p = sessaoExercicio.toPrimitives();
    const todosNaSessao = await this.deps.sessaoExercicioRepository.listBySessaoId(p.sessaoTreinoId);
    const idsNaSessao = new Set(todosNaSessao.map((se) => se.toPrimitives().exercicioId));

    const [todosExercicios, ultimasExecucoes] = await Promise.all([
      this.deps.exerciseRepository.list(),
      this.deps.historicoRepository.getUltimasExecucoesValidas(),
    ]);

    const musculoAlvo = p.musculoAlvoSnapshot;
    const grupoMuscular = p.grupoMuscularSnapshot;

    const camada1: CandidatoSubstituto[] = [];
    const camada2: CandidatoSubstituto[] = [];

    for (const ex of todosExercicios) {
      const ep = ex.toPrimitives();
      if (idsNaSessao.has(ep.id)) continue;

      const candidato: CandidatoSubstituto = {
        exercicio: ep,
        enfaseDiferente: false,
        ultimaExecucao: ultimasExecucoes.get(ep.id) ?? null,
      };

      if (musculoAlvo && ep.musculoAlvo === musculoAlvo) {
        camada1.push(candidato);
      } else if (ep.groupMuscle === grupoMuscular || ep.groupMuscle.includes(grupoMuscular) || grupoMuscular.includes(ep.groupMuscle)) {
        camada2.push({ ...candidato, enfaseDiferente: true });
      }
    }

    return [...camada1, ...camada2];
  }
}
