import { describe, expect, it } from 'vitest';

import { SerieSegmento } from '../../../domain/sessoes/entities/SerieSegmento';
import { SessaoExercicio } from '../../../domain/sessoes/entities/SessaoExercicio';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { InMemorySerieRegistradaRepository } from '../../../infrastructure/sessoes/InMemorySerieRegistradaRepository';
import { InMemorySerieSegmentoRepository } from '../../../infrastructure/sessoes/InMemorySerieSegmentoRepository';
import { InMemorySessaoExercicioRepository } from '../../../infrastructure/sessoes/InMemorySessaoExercicioRepository';
import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { InMemoryTreinoExercicioRepository } from '../../../infrastructure/treinos/InMemoryTreinoExercicioRepository';
import { SegmentoNotFoundError } from '../errors/SegmentoNotFoundError';
import { SessaoEncerradaError } from '../errors/SessaoEncerradaError';

import { RegistrarSerieUseCase } from './RegistrarSerieUseCase';
import { RemoverSegmentoUseCase } from './RemoverSegmentoUseCase';

function makeDeps() {
  const sessaoTreinoRepository = new InMemorySessaoTreinoRepository();
  const sessaoExercicioRepository = new InMemorySessaoExercicioRepository();
  const serieRegistradaRepository = new InMemorySerieRegistradaRepository();
  const serieSegmentoRepository = new InMemorySerieSegmentoRepository();

  return {
    sessaoTreinoRepository,
    sessaoExercicioRepository,
    serieRegistradaRepository,
    serieSegmentoRepository,
    useCase: new RemoverSegmentoUseCase({
      serieSegmentoRepository,
      serieRegistradaRepository,
      sessaoExercicioRepository,
      sessaoTreinoRepository,
    }),
  };
}

async function seedComSegmento(deps: ReturnType<typeof makeDeps>): Promise<string> {
  const sessao = SessaoTreino.create({ id: 'sessao_1', treinoId: 't1', treinoNomeSnapshot: 'A', dataHoraInicio: new Date() });
  await deps.sessaoTreinoRepository.save(sessao);

  const se = SessaoExercicio.create({ id: 'se_1', sessaoTreinoId: 'sessao_1', exercicioId: 'ex_1', ordem: 1, nomeSnapshot: 'Supino', grupoMuscularSnapshot: 'Peito', categoriaSnapshot: 'Composto', equipamentoSnapshot: null, musculoAlvoSnapshot: [], movementPatternSnapshot: null, realizado: true, seriesRecomendadas: null, execucoesRecomendadas: null, cargaPadrao: null, tempoDescansoSegundos: null, metodo: 'drop_set', grupoId: null, trackingTypeSnapshot: 'reps_load', duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null, substituidoPorExercicioId: null, substituicaoMotivo: null, nomeOriginalSnapshot: null });
  await deps.sessaoExercicioRepository.save(se);

  const registrarSerie = new RegistrarSerieUseCase({
    sessaoTreinoRepository: deps.sessaoTreinoRepository,
    sessaoExercicioRepository: deps.sessaoExercicioRepository,
    serieRegistradaRepository: deps.serieRegistradaRepository,
    serieSegmentoRepository: deps.serieSegmentoRepository,
    treinoExercicioRepository: new InMemoryTreinoExercicioRepository(),
    idGenerator: () => 'serie_1',
  });
  const serie = await registrarSerie.execute({ sessaoExercicioId: 'se_1', cargaKg: 60, repeticoes: 8 });

  const segmento = SerieSegmento.create({ id: 'seg_1', serieId: serie.id, ordem: 2, cargaKg: 50, repeticoes: 6 });
  await deps.serieSegmentoRepository.save(segmento);
  return segmento.toPrimitives().id;
}

describe('RemoverSegmentoUseCase', () => {
  it('removes an existing segmento (tombstone)', async () => {
    const deps = makeDeps();
    const segmentoId = await seedComSegmento(deps);

    await deps.useCase.execute(segmentoId);

    expect(await deps.serieSegmentoRepository.findById(segmentoId)).toBeNull();
  });

  it('throws SegmentoNotFoundError when segmento does not exist', async () => {
    const deps = makeDeps();
    await expect(deps.useCase.execute('missing')).rejects.toThrow(SegmentoNotFoundError);
  });

  it('throws SessaoEncerradaError when session is finalized', async () => {
    const deps = makeDeps();
    const segmentoId = await seedComSegmento(deps);
    const sessao = await deps.sessaoTreinoRepository.findById('sessao_1');
    await deps.sessaoTreinoRepository.save(sessao!.finalizar(new Date()));

    await expect(deps.useCase.execute(segmentoId)).rejects.toThrow(SessaoEncerradaError);
  });
});
