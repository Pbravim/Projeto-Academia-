import { describe, expect, it } from 'vitest';

import { SessaoExercicio, type SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { Treino } from '../../../domain/treinos/entities/Treino';
import { TreinoExercicio } from '../../../domain/treinos/entities/TreinoExercicio';
import { InMemorySerieRegistradaRepository } from '../../../infrastructure/sessoes/InMemorySerieRegistradaRepository';
import { InMemorySessaoExercicioRepository } from '../../../infrastructure/sessoes/InMemorySessaoExercicioRepository';
import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { InMemoryTreinoExercicioRepository } from '../../../infrastructure/treinos/InMemoryTreinoExercicioRepository';
import { InMemoryTreinoRepository } from '../../../infrastructure/treinos/InMemoryTreinoRepository';
import { ExerciseNotFoundError } from '../../exercises/errors/ExerciseNotFoundError';
import { TreinoNotFoundError } from '../../treinos/errors/TreinoNotFoundError';
import { SessaoNotFoundError } from '../errors/SessaoNotFoundError';
import { SessaoSemTreinoError } from '../errors/SessaoSemTreinoError';

import { AdicionarExerciciosAoTreinoUseCase } from './AdicionarExerciciosAoTreinoUseCase';

function baseSessaoExercicio(overrides: Partial<SessaoExercicioPrimitives>): SessaoExercicioPrimitives {
  return {
    id: 'se_1',
    sessaoTreinoId: 'sessao_1',
    exercicioId: 'ex_1',
    ordem: 1,
    nomeSnapshot: 'Rosca',
    grupoMuscularSnapshot: 'Biceps',
    categoriaSnapshot: 'Isolado',
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
    trackingTypeSnapshot: 'reps_load',
    duracaoRecomendadaSegundos: null,
    distanciaRecomendadaMetros: null,
    intensidadeRecomendada: null,
    substituidoPorExercicioId: null,
    substituicaoMotivo: null,
    nomeOriginalSnapshot: null,
    ...overrides,
  };
}

async function makeDeps() {
  const sessaoTreinoRepository = new InMemorySessaoTreinoRepository();
  const sessaoExercicioRepository = new InMemorySessaoExercicioRepository();
  const serieRegistradaRepository = new InMemorySerieRegistradaRepository();
  const treinoRepository = new InMemoryTreinoRepository();
  const treinoExercicioRepository = new InMemoryTreinoExercicioRepository();
  let counter = 0;

  const useCase = new AdicionarExerciciosAoTreinoUseCase({
    sessaoTreinoRepository,
    sessaoExercicioRepository,
    serieRegistradaRepository,
    treinoRepository,
    treinoExercicioRepository,
    idGenerator: () => `te_${++counter}`,
  });

  await treinoRepository.save(Treino.create({ id: 'treino_1', name: 'Treino A', createdAt: new Date() }));
  await treinoExercicioRepository.save(
    TreinoExercicio.create({
      id: 'te_existente', treinoId: 'treino_1', exercicioId: 'ex_template', ordem: 1,
      seriesRecomendadas: null, execucoesRecomendadas: null, cargaPadrao: null, tempoDescansoSegundos: null,
      metodo: 'normal', grupoId: null, duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null,
    })
  );
  await sessaoTreinoRepository.save(
    SessaoTreino.create({ id: 'sessao_1', treinoId: 'treino_1', treinoNomeSnapshot: 'Treino A', dataHoraInicio: new Date() })
  );
  await sessaoExercicioRepository.save(SessaoExercicio.create(baseSessaoExercicio({ id: 'se_1', exercicioId: 'ex_avulso_1', ordem: 2, nomeSnapshot: 'Rosca' })));
  await sessaoExercicioRepository.save(SessaoExercicio.create(baseSessaoExercicio({ id: 'se_2', exercicioId: 'ex_avulso_2', ordem: 3, nomeSnapshot: 'Triceps' })));
  await sessaoExercicioRepository.save(SessaoExercicio.create(baseSessaoExercicio({ id: 'se_3', exercicioId: 'ex_avulso_3', ordem: 4, nomeSnapshot: 'Panturrilha' })));

  return { sessaoTreinoRepository, sessaoExercicioRepository, treinoRepository, treinoExercicioRepository, useCase };
}

describe('AdicionarExerciciosAoTreinoUseCase (#33)', () => {
  it('adiciona os exercicios escolhidos ao treino com ordem = max+1, max+2', async () => {
    const deps = await makeDeps();

    const criados = await deps.useCase.execute({ sessaoId: 'sessao_1', exercicioIds: ['ex_avulso_1', 'ex_avulso_2'] });

    expect(criados).toHaveLength(2);
    expect(criados[0]).toMatchObject({ exercicioId: 'ex_avulso_1', ordem: 2 });
    expect(criados[1]).toMatchObject({ exercicioId: 'ex_avulso_2', ordem: 3 });
    const todos = await deps.treinoExercicioRepository.listByTreinoId('treino_1');
    expect(todos).toHaveLength(3);
  });

  it('pula exercicio que ja esta no treino (idempotente)', async () => {
    const deps = await makeDeps();
    await deps.treinoExercicioRepository.save(
      TreinoExercicio.create({
        id: 'te_ja', treinoId: 'treino_1', exercicioId: 'ex_avulso_1', ordem: 2,
        seriesRecomendadas: null, execucoesRecomendadas: null, cargaPadrao: null, tempoDescansoSegundos: null,
        metodo: 'normal', grupoId: null, duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null,
      })
    );

    const criados = await deps.useCase.execute({ sessaoId: 'sessao_1', exercicioIds: ['ex_avulso_1'] });

    expect(criados).toHaveLength(0);
    const todos = await deps.treinoExercicioRepository.listByTreinoId('treino_1');
    expect(todos).toHaveLength(2);
  });

  it('exercicioId repetido na sessao (substituicao): usa o template da 1a ocorrencia (achado 2, sev1)', async () => {
    const deps = await makeDeps();
    // 2a ocorrencia do mesmo exercicioId (ex.: exercicio original reapareceu apos uma substituicao no meio da sessao).
    await deps.sessaoExercicioRepository.save(
      SessaoExercicio.create(baseSessaoExercicio({ id: 'se_dup', exercicioId: 'ex_avulso_1', ordem: 5, tempoDescansoSegundos: 999 }))
    );

    const criados = await deps.useCase.execute({ sessaoId: 'sessao_1', exercicioIds: ['ex_avulso_1'] });

    expect(criados).toHaveLength(1);
    expect(criados[0].tempoDescansoSegundos).toBeNull();
  });

  it('reativa tombstone reutilizando o id quando o par (treino, exercicio) ja existiu', async () => {
    const deps = await makeDeps();
    const tombstonedIdSpy = deps.treinoExercicioRepository.findTombstonedId.bind(deps.treinoExercicioRepository);
    deps.treinoExercicioRepository.findTombstonedId = async (treinoId: string, exercicioId: string) => {
      if (exercicioId === 'ex_avulso_1') return 'te_tombstoned';
      return tombstonedIdSpy(treinoId, exercicioId);
    };

    const criados = await deps.useCase.execute({ sessaoId: 'sessao_1', exercicioIds: ['ex_avulso_1'] });

    expect(criados[0].id).toBe('te_tombstoned');
  });

  it('rejeita sessao livre (sem treino)', async () => {
    const sessaoTreinoRepository = new InMemorySessaoTreinoRepository();
    await sessaoTreinoRepository.save(
      SessaoTreino.create({ id: 'sessao_livre', treinoId: null, treinoNomeSnapshot: 'Treino livre 15/09', dataHoraInicio: new Date() })
    );
    const useCase = new AdicionarExerciciosAoTreinoUseCase({
      sessaoTreinoRepository,
      sessaoExercicioRepository: new InMemorySessaoExercicioRepository(),
      serieRegistradaRepository: new InMemorySerieRegistradaRepository(),
      treinoRepository: new InMemoryTreinoRepository(),
      treinoExercicioRepository: new InMemoryTreinoExercicioRepository(),
      idGenerator: () => 'te_x',
    });

    await expect(useCase.execute({ sessaoId: 'sessao_livre', exercicioIds: [] })).rejects.toBeInstanceOf(SessaoSemTreinoError);
  });

  it('rejeita sessao inexistente', async () => {
    const deps = await makeDeps();

    await expect(deps.useCase.execute({ sessaoId: 'nao-existe', exercicioIds: [] })).rejects.toBeInstanceOf(SessaoNotFoundError);
  });

  it('rejeita treino inexistente (apagado durante a sessao)', async () => {
    const sessaoTreinoRepository = new InMemorySessaoTreinoRepository();
    await sessaoTreinoRepository.save(
      SessaoTreino.create({ id: 'sessao_1', treinoId: 'treino_apagado', treinoNomeSnapshot: 'Treino A', dataHoraInicio: new Date() })
    );
    const useCase = new AdicionarExerciciosAoTreinoUseCase({
      sessaoTreinoRepository,
      sessaoExercicioRepository: new InMemorySessaoExercicioRepository(),
      serieRegistradaRepository: new InMemorySerieRegistradaRepository(),
      treinoRepository: new InMemoryTreinoRepository(),
      treinoExercicioRepository: new InMemoryTreinoExercicioRepository(),
      idGenerator: () => 'te_x',
    });

    await expect(useCase.execute({ sessaoId: 'sessao_1', exercicioIds: [] })).rejects.toBeInstanceOf(TreinoNotFoundError);
  });

  it('rejeita id que nao pertence a sessao', async () => {
    const deps = await makeDeps();

    await expect(
      deps.useCase.execute({ sessaoId: 'sessao_1', exercicioIds: ['ex_fora_da_sessao'] })
    ).rejects.toBeInstanceOf(ExerciseNotFoundError);
  });

  it('usa withTransaction quando a dependencia database e informada', async () => {
    const deps = await makeDeps();
    const chamadas: string[] = [];
    const database = {
      withTransaction: async <T>(fn: () => Promise<T>): Promise<T> => {
        chamadas.push('withTransaction');
        return fn();
      },
    };
    const useCase = new AdicionarExerciciosAoTreinoUseCase({
      sessaoTreinoRepository: deps.sessaoTreinoRepository,
      sessaoExercicioRepository: deps.sessaoExercicioRepository,
      serieRegistradaRepository: new InMemorySerieRegistradaRepository(),
      treinoRepository: deps.treinoRepository,
      treinoExercicioRepository: deps.treinoExercicioRepository,
      idGenerator: () => 'te_x',
      database,
    });

    await useCase.execute({ sessaoId: 'sessao_1', exercicioIds: ['ex_avulso_1'] });

    expect(chamadas).toEqual(['withTransaction']);
  });
});
