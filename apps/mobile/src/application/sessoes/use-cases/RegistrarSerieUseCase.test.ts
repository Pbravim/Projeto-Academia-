import { describe, expect, it } from 'vitest';

import { SessaoExercicio } from '../../../domain/sessoes/entities/SessaoExercicio';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { InMemorySessaoExercicioRepository } from '../../../infrastructure/sessoes/InMemorySessaoExercicioRepository';
import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { InMemorySerieRegistradaRepository } from '../../../infrastructure/sessoes/InMemorySerieRegistradaRepository';
import { InMemoryTreinoExercicioRepository } from '../../../infrastructure/treinos/InMemoryTreinoExercicioRepository';
import { SessaoValidationError } from '../../../domain/sessoes/errors/SessaoValidationError';
import { SessaoEncerradaError } from '../errors/SessaoEncerradaError';
import { RegistrarSerieUseCase } from './RegistrarSerieUseCase';

function makeDeps() {
  const sessaoTreinoRepository = new InMemorySessaoTreinoRepository();
  const sessaoExercicioRepository = new InMemorySessaoExercicioRepository();
  const serieRegistradaRepository = new InMemorySerieRegistradaRepository();
  const treinoExercicioRepository = new InMemoryTreinoExercicioRepository();
  let counter = 0;

  return {
    sessaoTreinoRepository,
    sessaoExercicioRepository,
    serieRegistradaRepository,
    treinoExercicioRepository,
    useCase: new RegistrarSerieUseCase({
      sessaoTreinoRepository,
      sessaoExercicioRepository,
      serieRegistradaRepository,
      treinoExercicioRepository,
      idGenerator: () => `serie_${++counter}`,
    }),
  };
}

async function seedAtiva(deps: ReturnType<typeof makeDeps>, trackingTypeSnapshot = 'reps_load') {
  const sessao = SessaoTreino.create({ id: 'sessao_1', treinoId: 't1', treinoNomeSnapshot: 'A', dataHoraInicio: new Date() });
  await deps.sessaoTreinoRepository.save(sessao);

  const se = SessaoExercicio.create({ id: 'se_1', sessaoTreinoId: 'sessao_1', exercicioId: 'ex_1', ordem: 1, nomeSnapshot: 'Supino', grupoMuscularSnapshot: 'Peito', categoriaSnapshot: 'Composto', equipamentoSnapshot: null, musculoAlvoSnapshot: [], movementPatternSnapshot: null, realizado: true, seriesRecomendadas: null, execucoesRecomendadas: null, cargaPadrao: null, tempoDescansoSegundos: null, metodo: 'normal', grupoId: null, trackingTypeSnapshot, duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null, substituidoPorExercicioId: null, substituicaoMotivo: null, nomeOriginalSnapshot: null });
  await deps.sessaoExercicioRepository.save(se);
}

describe('RegistrarSerieUseCase', () => {
  it('registers a valid serie with correct ordem', async () => {
    const deps = makeDeps();
    await seedAtiva(deps);

    const serie = await deps.useCase.execute({ sessaoExercicioId: 'se_1', cargaKg: 100, repeticoes: 8 });

    expect(serie.cargaKg).toBe(100);
    expect(serie.repeticoes).toBe(8);
    expect(serie.ordem).toBe(1);
  });

  it('assigns incrementing ordem for multiple series', async () => {
    const deps = makeDeps();
    await seedAtiva(deps);

    await deps.useCase.execute({ sessaoExercicioId: 'se_1', cargaKg: 60, repeticoes: 15 });
    const second = await deps.useCase.execute({ sessaoExercicioId: 'se_1', cargaKg: 100, repeticoes: 8 });

    expect(second.ordem).toBe(2);
  });

  it('does not reuse an ordem after a middle serie is deleted (no CSV duplicate)', async () => {
    const deps = makeDeps();
    await seedAtiva(deps);

    await deps.useCase.execute({ sessaoExercicioId: 'se_1', cargaKg: 60, repeticoes: 10 }); // ordem 1
    await deps.useCase.execute({ sessaoExercicioId: 'se_1', cargaKg: 70, repeticoes: 10 }); // ordem 2 (serie_2)
    await deps.useCase.execute({ sessaoExercicioId: 'se_1', cargaKg: 80, repeticoes: 10 }); // ordem 3

    // Usuario deleta a serie do meio e registra outra no lugar
    await deps.serieRegistradaRepository.delete('serie_2');
    const replacement = await deps.useCase.execute({ sessaoExercicioId: 'se_1', cargaKg: 75, repeticoes: 10 });

    // Antes do fix: count(ativas)+1 = 3, colidindo com a serie de ordem 3 ja existente.
    expect(replacement.ordem).toBe(4);

    const remaining = await deps.serieRegistradaRepository.listBySessaoExercicioId('se_1');
    const ordens = remaining.map((s) => s.toPrimitives().ordem);
    expect(new Set(ordens).size).toBe(ordens.length); // sem duplicatas
  });

  it('throws SessaoEncerradaError when session is finalized', async () => {
    const deps = makeDeps();
    await seedAtiva(deps);
    const sessao = await deps.sessaoTreinoRepository.findById('sessao_1');
    await deps.sessaoTreinoRepository.save(sessao!.finalizar(new Date()));

    await expect(
      deps.useCase.execute({ sessaoExercicioId: 'se_1', cargaKg: 100, repeticoes: 8 })
    ).rejects.toThrow(SessaoEncerradaError);
  });

  it('throws SessaoValidationError for invalid carga', async () => {
    const deps = makeDeps();
    await seedAtiva(deps);

    await expect(
      deps.useCase.execute({ sessaoExercicioId: 'se_1', cargaKg: -1, repeticoes: 8 })
    ).rejects.toThrow(SessaoValidationError);
  });

  it('throws SessaoValidationError for zero repeticoes', async () => {
    const deps = makeDeps();
    await seedAtiva(deps);

    await expect(
      deps.useCase.execute({ sessaoExercicioId: 'se_1', cargaKg: 50, repeticoes: 0 })
    ).rejects.toThrow(SessaoValidationError);
  });

  it('registers a cardio serie with duracao + intensidade (no carga/reps)', async () => {
    const deps = makeDeps();
    await seedAtiva(deps, 'cardio');

    const serie = await deps.useCase.execute({
      sessaoExercicioId: 'se_1',
      duracaoSegundos: 600,
      intensidade: 8,
      distanciaMetros: 1500,
    });

    expect(serie.duracaoSegundos).toBe(600);
    expect(serie.intensidade).toBe(8);
    expect(serie.distanciaMetros).toBe(1500);
    expect(serie.cargaKg).toBeNull();
    expect(serie.repeticoes).toBeNull();
  });

  it('throws SessaoValidationError for cardio serie without duracao', async () => {
    const deps = makeDeps();
    await seedAtiva(deps, 'cardio');

    await expect(
      deps.useCase.execute({ sessaoExercicioId: 'se_1', intensidade: 8 })
    ).rejects.toThrow(SessaoValidationError);
  });

  it('registers a hold serie with only duracao', async () => {
    const deps = makeDeps();
    await seedAtiva(deps, 'hold');

    const serie = await deps.useCase.execute({ sessaoExercicioId: 'se_1', duracaoSegundos: 45 });

    expect(serie.duracaoSegundos).toBe(45);
    expect(serie.cargaKg).toBeNull();
    expect(serie.repeticoes).toBeNull();
  });

  it('registers a reps_only serie with only repeticoes (no carga)', async () => {
    const deps = makeDeps();
    await seedAtiva(deps, 'reps_only');

    const serie = await deps.useCase.execute({ sessaoExercicioId: 'se_1', repeticoes: 20 });

    expect(serie.repeticoes).toBe(20);
    expect(serie.cargaKg).toBeNull();
  });
});
