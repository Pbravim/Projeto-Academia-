import { describe, expect, it } from 'vitest';

import { SerieRegistrada } from '../../../domain/sessoes/entities/SerieRegistrada';
import { SessaoExercicio } from '../../../domain/sessoes/entities/SessaoExercicio';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { InMemorySerieRegistradaRepository } from '../../../infrastructure/sessoes/InMemorySerieRegistradaRepository';
import { InMemorySessaoExercicioRepository } from '../../../infrastructure/sessoes/InMemorySessaoExercicioRepository';
import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { SessaoEncerradaError } from '../errors/SessaoEncerradaError';
import { UpdateSerieUseCase } from './UpdateSerieUseCase';

function makeDeps() {
  const sessaoTreinoRepository = new InMemorySessaoTreinoRepository();
  const sessaoExercicioRepository = new InMemorySessaoExercicioRepository();
  const serieRegistradaRepository = new InMemorySerieRegistradaRepository();

  return {
    sessaoTreinoRepository,
    sessaoExercicioRepository,
    serieRegistradaRepository,
    useCase: new UpdateSerieUseCase({
      serieRegistradaRepository,
      sessaoExercicioRepository,
      sessaoTreinoRepository,
    }),
  };
}

async function seedAtiva(deps: ReturnType<typeof makeDeps>) {
  const sessao = SessaoTreino.create({
    id: 'sessao_1',
    treinoId: 't1',
    treinoNomeSnapshot: 'A',
    dataHoraInicio: new Date(),
  });
  await deps.sessaoTreinoRepository.save(sessao);

  const se = SessaoExercicio.create({
    id: 'se_1',
    sessaoTreinoId: 'sessao_1',
    exercicioId: 'ex_1',
    ordem: 1,
    nomeSnapshot: 'Supino',
    grupoMuscularSnapshot: 'Peito',
    categoriaSnapshot: 'Composto',
    equipamentoSnapshot: null,
    musculoAlvoSnapshot: [],
    movementPatternSnapshot: null,
    realizado: true,
    seriesRecomendadas: null,
    execucoesRecomendadas: null,
    cargaPadrao: null,
    tempoDescansoSegundos: null,
    metodo: 'normal',
    grupoId: null,
    substituidoPorExercicioId: null,
    substituicaoMotivo: null,
    nomeOriginalSnapshot: null,
  });
  await deps.sessaoExercicioRepository.save(se);

  const serie = SerieRegistrada.create({
    id: 'serie_1',
    sessaoExercicioId: 'se_1',
    ordem: 1,
    cargaKg: 60,
    repeticoes: 10,
  });
  await deps.serieRegistradaRepository.save(serie);
}

describe('UpdateSerieUseCase', () => {
  it('happy path: updates cargaKg, repeticoes, and observacao when session is active', async () => {
    const deps = makeDeps();
    await seedAtiva(deps);

    await deps.useCase.execute({
      serieId: 'serie_1',
      cargaKg: 80,
      repeticoes: 12,
      observacao: 'boa execucao',
    });

    const updated = await deps.serieRegistradaRepository.findById('serie_1');
    expect(updated).not.toBeNull();
    expect(updated!.toPrimitives().cargaKg).toBe(80);
    expect(updated!.toPrimitives().repeticoes).toBe(12);
    expect(updated!.toPrimitives().observacao).toBe('boa execucao');
  });

  it('not found: resolves without error when serieId does not exist', async () => {
    const deps = makeDeps();
    await seedAtiva(deps);

    await expect(
      deps.useCase.execute({ serieId: 'nonexistent', cargaKg: 80, repeticoes: 12 })
    ).resolves.toBeUndefined();
  });

  it('session finalized: throws SessaoEncerradaError when session has dataHoraFim set', async () => {
    const deps = makeDeps();
    await seedAtiva(deps);

    const sessao = await deps.sessaoTreinoRepository.findById('sessao_1');
    await deps.sessaoTreinoRepository.save(sessao!.finalizar(new Date()));

    await expect(
      deps.useCase.execute({ serieId: 'serie_1', cargaKg: 80, repeticoes: 12 })
    ).rejects.toThrow(SessaoEncerradaError);

    const unchanged = await deps.serieRegistradaRepository.findById('serie_1');
    expect(unchanged?.toPrimitives().cargaKg).toBe(60);   // original value
    expect(unchanged?.toPrimitives().repeticoes).toBe(10); // original value
  });

  it('null observacao: persists observacao as null', async () => {
    const deps = makeDeps();
    await seedAtiva(deps);

    await deps.useCase.execute({
      serieId: 'serie_1',
      cargaKg: 70,
      repeticoes: 8,
      observacao: null,
    });

    const updated = await deps.serieRegistradaRepository.findById('serie_1');
    expect(updated!.toPrimitives().observacao).toBeNull();
  });

  it('throws SessaoEncerradaError when session is cancelled', async () => {
    const deps = makeDeps();
    await seedAtiva(deps);

    const sessao = await deps.sessaoTreinoRepository.findById('sessao_1');
    await deps.sessaoTreinoRepository.save(sessao!.cancelar());

    await expect(
      deps.useCase.execute({ serieId: 'serie_1', cargaKg: 80, repeticoes: 12 })
    ).rejects.toThrow(SessaoEncerradaError);

    const unchanged = await deps.serieRegistradaRepository.findById('serie_1');
    expect(unchanged?.toPrimitives().cargaKg).toBe(60);   // original value
    expect(unchanged?.toPrimitives().repeticoes).toBe(10); // original value
  });
});
