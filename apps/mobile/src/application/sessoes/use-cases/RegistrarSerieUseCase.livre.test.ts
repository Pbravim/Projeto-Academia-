import { describe, expect, it, vi } from 'vitest';

import { SessaoExercicio } from '../../../domain/sessoes/entities/SessaoExercicio';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { InMemorySerieRegistradaRepository } from '../../../infrastructure/sessoes/InMemorySerieRegistradaRepository';
import { InMemorySerieSegmentoRepository } from '../../../infrastructure/sessoes/InMemorySerieSegmentoRepository';
import { InMemorySessaoExercicioRepository } from '../../../infrastructure/sessoes/InMemorySessaoExercicioRepository';
import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { InMemoryTreinoExercicioRepository } from '../../../infrastructure/treinos/InMemoryTreinoExercicioRepository';

import { RegistrarSerieUseCase } from './RegistrarSerieUseCase';

function makeDeps() {
  const sessaoTreinoRepository = new InMemorySessaoTreinoRepository();
  const sessaoExercicioRepository = new InMemorySessaoExercicioRepository();
  const serieRegistradaRepository = new InMemorySerieRegistradaRepository();
  const serieSegmentoRepository = new InMemorySerieSegmentoRepository();
  const treinoExercicioRepository = new InMemoryTreinoExercicioRepository();
  let counter = 0;

  return {
    sessaoExercicioRepository,
    treinoExercicioRepository,
    useCase: new RegistrarSerieUseCase({
      sessaoTreinoRepository,
      sessaoExercicioRepository,
      serieRegistradaRepository,
      serieSegmentoRepository,
      treinoExercicioRepository,
      idGenerator: () => `serie_${++counter}`,
    }),
    sessaoTreinoRepository,
  };
}

async function seedAtivaLivre(deps: ReturnType<typeof makeDeps>) {
  const sessao = SessaoTreino.create({ id: 'sessao_1', treinoId: null, treinoNomeSnapshot: 'Treino livre 13/09', dataHoraInicio: new Date() });
  await deps.sessaoTreinoRepository.save(sessao);

  const se = SessaoExercicio.create({
    id: 'se_1', sessaoTreinoId: 'sessao_1', exercicioId: 'ex_1', ordem: 1, nomeSnapshot: 'Supino',
    grupoMuscularSnapshot: 'Peito', categoriaSnapshot: 'Composto', equipamentoSnapshot: null,
    musculoAlvoSnapshot: [], movementPatternSnapshot: null, realizado: true,
    seriesRecomendadas: null, execucoesRecomendadas: 10, cargaPadrao: null, tempoDescansoSegundos: null,
    metodo: 'normal', grupoId: null, trackingTypeSnapshot: 'reps_load',
    duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null,
    substituidoPorExercicioId: null, substituicaoMotivo: null, nomeOriginalSnapshot: null,
  });
  await deps.sessaoExercicioRepository.save(se);
}

describe('RegistrarSerieUseCase — sessao sem treino (#33)', () => {
  it('bate a meta numa sessao livre: atualiza o snapshot da sessao mas nao busca template de treino', async () => {
    const deps = makeDeps();
    await seedAtivaLivre(deps);
    const findByTreinoIdSpy = vi.spyOn(deps.treinoExercicioRepository, 'findByTreinoIdAndExercicioId');

    await deps.useCase.execute({ sessaoExercicioId: 'se_1', cargaKg: 60, repeticoes: 10 });

    const se = await deps.sessaoExercicioRepository.findById('se_1');
    expect(se?.toPrimitives().cargaPadrao).toBe(60);
    expect(findByTreinoIdSpy).not.toHaveBeenCalled();
  });
});
