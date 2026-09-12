import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';
import type { HistoricoRepository, UltimaExecucaoValida } from '../../../domain/historico/repositories/HistoricoRepository';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import { SessaoExercicioNotFoundError } from '../errors/SessaoExercicioNotFoundError';

export type SimilaridadeNivel = 'quase_igual' | 'similar' | 'mesmo_grupo' | 'catalogo';

export interface CandidatoSubstituto {
  exercicio: ExercisePrimitives;
  predefinido: boolean;
  similaridade: SimilaridadeNivel;
  ultimaExecucao: UltimaExecucaoValida | null;
}

interface Dependencies {
  sessaoExercicioRepository: SessaoExercicioRepository;
  exerciseRepository: ExerciseRepository;
  historicoRepository: HistoricoRepository;
}

function splitGrupos(grupoSnapshot: string): string[] {
  return grupoSnapshot.split(',').map((g) => g.trim()).filter(Boolean);
}

function temIntersecaoDeGrupo(groups: string[], grupoSnapshot: string): boolean {
  const gb = new Set(splitGrupos(grupoSnapshot));
  return groups.some((g) => gb.has(g));
}

function musculoOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  return a.filter((m) => setB.has(m)).length / Math.max(a.length, b.length);
}

export class SugerirSubstitutosUseCase {
  constructor(private readonly deps: Dependencies) {}

  async execute(sessaoExercicioId: string): Promise<CandidatoSubstituto[]> {
    const sessaoExercicio = await this.deps.sessaoExercicioRepository.findById(sessaoExercicioId);
    if (!sessaoExercicio) throw new SessaoExercicioNotFoundError(sessaoExercicioId);

    const p = sessaoExercicio.toPrimitives();
    const todosNaSessao = await this.deps.sessaoExercicioRepository.listBySessaoId(p.sessaoTreinoId);
    const idsNaSessao = new Set(todosNaSessao.map((se) => se.toPrimitives().exercicioId));

    const [todosExercicios, ultimasExecucoes, equivalentes] = await Promise.all([
      this.deps.exerciseRepository.list(),
      this.deps.historicoRepository.getUltimasExecucoesValidas(),
      this.deps.exerciseRepository.listEquivalentAlternativas(p.exercicioId),
    ]);

    const musculos = p.musculoAlvoSnapshot;   // string[]
    const grupo = p.grupoMuscularSnapshot;
    const pattern = p.movementPatternSnapshot;

    const idsPredefinidos = new Set(equivalentes.map((e) => e.toPrimitives().id));

    const camada0: CandidatoSubstituto[] = equivalentes
      .map((ex) => ex.toPrimitives())
      .filter((ep) => !idsNaSessao.has(ep.id))
      .map((ep) => ({
        exercicio: ep,
        predefinido: true,
        similaridade: 'quase_igual' as SimilaridadeNivel,
        ultimaExecucao: ultimasExecucoes.get(ep.id) ?? null,
      }));

    const camada1: CandidatoSubstituto[] = [];
    const camada2: CandidatoSubstituto[] = [];
    const camada3: CandidatoSubstituto[] = [];
    const camadaCatalogo: CandidatoSubstituto[] = [];

    for (const ex of todosExercicios) {
      const ep = ex.toPrimitives();
      if (idsNaSessao.has(ep.id) || idsPredefinidos.has(ep.id)) continue;

      const base: Omit<CandidatoSubstituto, 'similaridade'> = {
        exercicio: ep,
        predefinido: false,
        ultimaExecucao: ultimasExecucoes.get(ep.id) ?? null,
      };

      const samePattern = pattern !== null && ep.movementPattern === pattern;
      const overlap = musculoOverlap(musculos, ep.musculoAlvo);

      if (samePattern && overlap >= 0.5) {
        camada1.push({ ...base, similaridade: 'quase_igual' });
      } else if (samePattern) {
        camada2.push({ ...base, similaridade: 'similar' });
      } else if (temIntersecaoDeGrupo(ep.groupMuscles, grupo)) {
        camada3.push({ ...base, similaridade: 'mesmo_grupo' });
      } else {
        camadaCatalogo.push({ ...base, similaridade: 'catalogo' });
      }
    }

    return [...camada0, ...camada1, ...camada2, ...camada3, ...camadaCatalogo];
  }
}
