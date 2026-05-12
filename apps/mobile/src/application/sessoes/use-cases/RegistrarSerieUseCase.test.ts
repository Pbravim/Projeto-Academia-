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

async function seedAtiva(deps: ReturnType<typeof makeDeps>) {
  const sessao = SessaoTreino.create({ id: 'sessao_1', treinoId: 't1', treinoNomeSnapshot: 'A', dataHoraInicio: new Date() });
  await deps.sessaoTreinoRepository.save(sessao);

  const se = SessaoExercicio.create({ id: 'se_1', sessaoTreinoId: 'sessao_1', exercicioId: 'ex_1', ordem: 1, nomeSnapshot: 'Supino', grupoMuscularSnapshot: 'Peito', categoriaSnapshot: 'Composto', equipamentoSnapshot: null, musculoAlvoSnapshot: null, realizado: true, seriesRecomendadas: null, execucoesRecomendadas: null, cargaPadrao: null, tempoDescansoSegundos: null, substituidoPorExercicioId: null, substituicaoMotivo: null, nomeOriginalSnapshot: null });
  await deps.sessaoExercicioRepository.save(se);
}

describe('RegistrarSerieUseCase', () => {
  it('registers a valid serie with correct ordem', async () => {
    const deps = makeDeps();
    await seedAtiva(deps);

    const serie = await deps.useCase.execute({ sessaoExercicioId: 'se_1', tipoSerie: 'valida', cargaKg: 100, repeticoes: 8 });

    expect(serie.cargaKg).toBe(100);
    expect(serie.repeticoes).toBe(8);
    expect(serie.tipoSerie).toBe('valida');
    expect(serie.ordem).toBe(1);
  });

  it('assigns incrementing ordem for multiple series', async () => {
    const deps = makeDeps();
    await seedAtiva(deps);

    await deps.useCase.execute({ sessaoExercicioId: 'se_1', tipoSerie: 'aquecimento', cargaKg: 60, repeticoes: 15 });
    const second = await deps.useCase.execute({ sessaoExercicioId: 'se_1', tipoSerie: 'valida', cargaKg: 100, repeticoes: 8 });

    expect(second.ordem).toBe(2);
  });

  it('throws SessaoEncerradaError when session is finalized', async () => {
    const deps = makeDeps();
    await seedAtiva(deps);
    const sessao = await deps.sessaoTreinoRepository.findById('sessao_1');
    await deps.sessaoTreinoRepository.save(sessao!.finalizar(new Date()));

    await expect(
      deps.useCase.execute({ sessaoExercicioId: 'se_1', tipoSerie: 'valida', cargaKg: 100, repeticoes: 8 })
    ).rejects.toThrow(SessaoEncerradaError);
  });

  it('throws SessaoValidationError for invalid carga', async () => {
    const deps = makeDeps();
    await seedAtiva(deps);

    await expect(
      deps.useCase.execute({ sessaoExercicioId: 'se_1', tipoSerie: 'valida', cargaKg: -1, repeticoes: 8 })
    ).rejects.toThrow(SessaoValidationError);
  });

  it('throws SessaoValidationError for zero repeticoes', async () => {
    const deps = makeDeps();
    await seedAtiva(deps);

    await expect(
      deps.useCase.execute({ sessaoExercicioId: 'se_1', tipoSerie: 'valida', cargaKg: 50, repeticoes: 0 })
    ).rejects.toThrow(SessaoValidationError);
  });
});
