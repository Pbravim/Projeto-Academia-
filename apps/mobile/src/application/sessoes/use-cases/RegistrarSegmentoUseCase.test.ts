import { describe, expect, it } from 'vitest';

import { SessaoExercicio } from '../../../domain/sessoes/entities/SessaoExercicio';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { SessaoValidationError } from '../../../domain/sessoes/errors/SessaoValidationError';
import { InMemorySerieRegistradaRepository } from '../../../infrastructure/sessoes/InMemorySerieRegistradaRepository';
import { InMemorySerieSegmentoRepository } from '../../../infrastructure/sessoes/InMemorySerieSegmentoRepository';
import { InMemorySessaoExercicioRepository } from '../../../infrastructure/sessoes/InMemorySessaoExercicioRepository';
import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { InMemoryTreinoExercicioRepository } from '../../../infrastructure/treinos/InMemoryTreinoExercicioRepository';
import { SerieNotFoundError } from '../errors/SerieNotFoundError';
import { SessaoEncerradaError } from '../errors/SessaoEncerradaError';

import { RegistrarSegmentoUseCase } from './RegistrarSegmentoUseCase';
import { RegistrarSerieUseCase } from './RegistrarSerieUseCase';

function makeDeps() {
  const sessaoTreinoRepository = new InMemorySessaoTreinoRepository();
  const sessaoExercicioRepository = new InMemorySessaoExercicioRepository();
  const serieRegistradaRepository = new InMemorySerieRegistradaRepository();
  const serieSegmentoRepository = new InMemorySerieSegmentoRepository();
  let counter = 0;

  return {
    sessaoTreinoRepository,
    sessaoExercicioRepository,
    serieRegistradaRepository,
    serieSegmentoRepository,
    useCase: new RegistrarSegmentoUseCase({
      serieRegistradaRepository,
      serieSegmentoRepository,
      sessaoExercicioRepository,
      sessaoTreinoRepository,
      idGenerator: () => `seg_${++counter}`,
    }),
  };
}

async function seedAtiva(deps: ReturnType<typeof makeDeps>, trackingTypeSnapshot = 'reps_load') {
  const sessao = SessaoTreino.create({ id: 'sessao_1', treinoId: 't1', treinoNomeSnapshot: 'A', dataHoraInicio: new Date() });
  await deps.sessaoTreinoRepository.save(sessao);

  const se = SessaoExercicio.create({ id: 'se_1', sessaoTreinoId: 'sessao_1', exercicioId: 'ex_1', ordem: 1, nomeSnapshot: 'Supino', grupoMuscularSnapshot: 'Peito', categoriaSnapshot: 'Composto', equipamentoSnapshot: null, musculoAlvoSnapshot: [], movementPatternSnapshot: null, realizado: true, seriesRecomendadas: null, execucoesRecomendadas: null, cargaPadrao: null, tempoDescansoSegundos: null, metodo: 'drop_set', grupoId: null, trackingTypeSnapshot, duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null, substituidoPorExercicioId: null, substituicaoMotivo: null, nomeOriginalSnapshot: null });
  await deps.sessaoExercicioRepository.save(se);

  let idCounter = 0;
  const registrarSerie = new RegistrarSerieUseCase({
    sessaoTreinoRepository: deps.sessaoTreinoRepository,
    sessaoExercicioRepository: deps.sessaoExercicioRepository,
    serieRegistradaRepository: deps.serieRegistradaRepository,
    serieSegmentoRepository: deps.serieSegmentoRepository,
    treinoExercicioRepository: new InMemoryTreinoExercicioRepository(),
    idGenerator: () => `serie_${++idCounter}`,
  });
  return trackingTypeSnapshot === 'cardio'
    ? registrarSerie.execute({ sessaoExercicioId: 'se_1', duracaoSegundos: 600 })
    : registrarSerie.execute({ sessaoExercicioId: 'se_1', cargaKg: 60, repeticoes: 8 });
}

describe('RegistrarSegmentoUseCase', () => {
  it('registers the 2nd degrau (ordem = 2) over the serie-mae', async () => {
    const deps = makeDeps();
    const serie = await seedAtiva(deps);

    const segmento = await deps.useCase.execute({ serieId: serie.id, cargaKg: 50, repeticoes: 6 });

    expect(segmento.ordem).toBe(2);
    expect(segmento.cargaKg).toBe(50);
    expect(segmento.repeticoes).toBe(6);
    expect(segmento.descansoSegundos).toBeNull();
  });

  it('assigns incrementing ordem for multiple segmentos', async () => {
    const deps = makeDeps();
    const serie = await seedAtiva(deps);

    await deps.useCase.execute({ serieId: serie.id, cargaKg: 50, repeticoes: 6 });
    const second = await deps.useCase.execute({ serieId: serie.id, cargaKg: 40, repeticoes: 7 });

    expect(second.ordem).toBe(3);
  });

  it('accepts an explicit descansoSegundos (rest-pause)', async () => {
    const deps = makeDeps();
    const serie = await seedAtiva(deps);

    const segmento = await deps.useCase.execute({ serieId: serie.id, cargaKg: 50, repeticoes: 6, descansoSegundos: 15 });

    expect(segmento.descansoSegundos).toBe(15);
  });

  it('throws SerieNotFoundError when serie-mae does not exist', async () => {
    const deps = makeDeps();
    await expect(
      deps.useCase.execute({ serieId: 'missing', cargaKg: 50, repeticoes: 6 })
    ).rejects.toThrow(SerieNotFoundError);
  });

  it('throws SessaoEncerradaError when session is finalized', async () => {
    const deps = makeDeps();
    const serie = await seedAtiva(deps);
    const sessao = await deps.sessaoTreinoRepository.findById('sessao_1');
    await deps.sessaoTreinoRepository.save(sessao!.finalizar(new Date()));

    await expect(
      deps.useCase.execute({ serieId: serie.id, cargaKg: 50, repeticoes: 6 })
    ).rejects.toThrow(SessaoEncerradaError);
  });

  it('throws SessaoValidationError when exercicio is not reps_load (e.g. cardio)', async () => {
    const deps = makeDeps();
    const serie = await seedAtiva(deps, 'cardio');

    await expect(
      deps.useCase.execute({ serieId: serie.id, cargaKg: 50, repeticoes: 6 })
    ).rejects.toThrow(SessaoValidationError);
  });

  it('throws SessaoValidationError for invalid carga', async () => {
    const deps = makeDeps();
    const serie = await seedAtiva(deps);

    await expect(
      deps.useCase.execute({ serieId: serie.id, cargaKg: -1, repeticoes: 6 })
    ).rejects.toThrow(SessaoValidationError);
  });
});
