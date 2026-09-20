import { describe, expect, it } from 'vitest';

import { SerieRegistrada } from '../../../domain/sessoes/entities/SerieRegistrada';
import { SessaoExercicio, type SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { Treino } from '../../../domain/treinos/entities/Treino';
import { InMemorySerieRegistradaRepository } from '../../../infrastructure/sessoes/InMemorySerieRegistradaRepository';
import { InMemorySessaoExercicioRepository } from '../../../infrastructure/sessoes/InMemorySessaoExercicioRepository';
import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { InMemoryTreinoExercicioRepository } from '../../../infrastructure/treinos/InMemoryTreinoExercicioRepository';
import { InMemoryTreinoRepository } from '../../../infrastructure/treinos/InMemoryTreinoRepository';
import { DuplicateTreinoError } from '../../treinos/errors/DuplicateTreinoError';
import { SessaoNotFoundError } from '../errors/SessaoNotFoundError';

import { SalvarSessaoComoTreinoUseCase } from './SalvarSessaoComoTreinoUseCase';

function baseSessaoExercicio(overrides: Partial<SessaoExercicioPrimitives>): SessaoExercicioPrimitives {
  return {
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
    cargaPadrao: 100,
    tempoDescansoSegundos: 90,
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

function makeDeps() {
  const sessaoTreinoRepository = new InMemorySessaoTreinoRepository();
  const sessaoExercicioRepository = new InMemorySessaoExercicioRepository();
  const serieRegistradaRepository = new InMemorySerieRegistradaRepository();
  const treinoRepository = new InMemoryTreinoRepository();
  const treinoExercicioRepository = new InMemoryTreinoExercicioRepository();
  let counter = 0;

  const useCase = new SalvarSessaoComoTreinoUseCase({
    sessaoTreinoRepository,
    sessaoExercicioRepository,
    serieRegistradaRepository,
    treinoRepository,
    treinoExercicioRepository,
    idGenerator: () => `id_${++counter}`,
    now: () => new Date('2026-09-15T10:00:00.000Z'),
  });

  return {
    sessaoTreinoRepository,
    sessaoExercicioRepository,
    serieRegistradaRepository,
    treinoRepository,
    treinoExercicioRepository,
    useCase,
  };
}

describe('SalvarSessaoComoTreinoUseCase (#33 — D2/D3)', () => {
  it('cria o treino com os exercicios da sessao, ordem preservada, sem carga e com o template de D3', async () => {
    const deps = makeDeps();
    await deps.sessaoTreinoRepository.save(
      SessaoTreino.create({ id: 'sessao_1', treinoId: null, treinoNomeSnapshot: 'Treino livre 15/09', dataHoraInicio: new Date() })
    );
    await deps.sessaoExercicioRepository.save(
      SessaoExercicio.create(baseSessaoExercicio({ id: 'se_1', exercicioId: 'ex_1', ordem: 1, metodo: 'drop_set', grupoId: null, tempoDescansoSegundos: 60 }))
    );
    await deps.sessaoExercicioRepository.save(
      SessaoExercicio.create(baseSessaoExercicio({ id: 'se_2', exercicioId: 'ex_2', ordem: 2, nomeSnapshot: 'Rosca' }))
    );
    await deps.serieRegistradaRepository.save(
      SerieRegistrada.create({ id: 'serie_1', sessaoExercicioId: 'se_1', tipoSerie: 'valida', ordem: 1, cargaKg: 60, repeticoes: 10 })
    );
    await deps.serieRegistradaRepository.save(
      SerieRegistrada.create({ id: 'serie_2', sessaoExercicioId: 'se_1', tipoSerie: 'valida', ordem: 2, cargaKg: 60, repeticoes: 8 })
    );

    const treino = await deps.useCase.execute({ sessaoId: 'sessao_1', nome: 'Meu novo treino' });

    expect(treino.name).toBe('Meu novo treino');
    const treinoExercicios = await deps.treinoExercicioRepository.listByTreinoId(treino.id);
    expect(treinoExercicios).toHaveLength(2);
    expect(treinoExercicios[0].toPrimitives()).toMatchObject({
      exercicioId: 'ex_1', ordem: 1, seriesRecomendadas: 2, execucoesRecomendadas: 9,
      cargaPadrao: null, metodo: 'drop_set', tempoDescansoSegundos: 60,
    });
    expect(treinoExercicios[1].toPrimitives()).toMatchObject({ exercicioId: 'ex_2', ordem: 2, cargaPadrao: null });
  });

  it('deduplica exercicioId repetido mantendo a primeira ocorrencia', async () => {
    const deps = makeDeps();
    await deps.sessaoTreinoRepository.save(
      SessaoTreino.create({ id: 'sessao_1', treinoId: null, treinoNomeSnapshot: 'Treino livre 15/09', dataHoraInicio: new Date() })
    );
    await deps.sessaoExercicioRepository.save(
      SessaoExercicio.create(baseSessaoExercicio({ id: 'se_1', exercicioId: 'ex_dup', ordem: 1, nomeSnapshot: 'Primeira' }))
    );
    await deps.sessaoExercicioRepository.save(
      SessaoExercicio.create(baseSessaoExercicio({ id: 'se_2', exercicioId: 'ex_dup', ordem: 2, nomeSnapshot: 'Segunda (substituicao)' }))
    );

    const treino = await deps.useCase.execute({ sessaoId: 'sessao_1', nome: 'Treino com duplicata' });

    const treinoExercicios = await deps.treinoExercicioRepository.listByTreinoId(treino.id);
    expect(treinoExercicios).toHaveLength(1);
    expect(treinoExercicios[0].toPrimitives().exercicioId).toBe('ex_dup');
  });

  it('rejeita nome duplicado', async () => {
    const deps = makeDeps();
    await deps.treinoRepository.save(Treino.create({ id: 'treino_existente', name: 'Treino A', createdAt: new Date() }));
    await deps.sessaoTreinoRepository.save(
      SessaoTreino.create({ id: 'sessao_1', treinoId: null, treinoNomeSnapshot: 'Treino livre 15/09', dataHoraInicio: new Date() })
    );

    await expect(deps.useCase.execute({ sessaoId: 'sessao_1', nome: 'treino a' })).rejects.toBeInstanceOf(DuplicateTreinoError);
  });

  it('colapsa espacos internos do nome antes de comparar duplicata (achado 3, sev1)', async () => {
    const deps = makeDeps();
    await deps.treinoRepository.save(Treino.create({ id: 'treino_existente', name: 'Treino Muito A', createdAt: new Date() }));
    await deps.sessaoTreinoRepository.save(
      SessaoTreino.create({ id: 'sessao_1', treinoId: null, treinoNomeSnapshot: 'Treino livre 15/09', dataHoraInicio: new Date() })
    );

    await expect(deps.useCase.execute({ sessaoId: 'sessao_1', nome: 'treino   muito   a' })).rejects.toBeInstanceOf(DuplicateTreinoError);
  });

  it('rejeita sessao cancelada', async () => {
    const deps = makeDeps();
    const sessao = SessaoTreino.create({ id: 'sessao_1', treinoId: null, treinoNomeSnapshot: 'Treino livre 15/09', dataHoraInicio: new Date() }).cancelar();
    await deps.sessaoTreinoRepository.save(sessao);

    await expect(deps.useCase.execute({ sessaoId: 'sessao_1', nome: 'Novo treino' })).rejects.toThrow('Sessao cancelada nao pode virar treino.');
  });

  it('rejeita sessao inexistente', async () => {
    const deps = makeDeps();

    await expect(deps.useCase.execute({ sessaoId: 'nao-existe', nome: 'Novo treino' })).rejects.toBeInstanceOf(SessaoNotFoundError);
  });

  it('atualiza o snapshot da sessao para o nome final e mantem treinoId null (D2)', async () => {
    const deps = makeDeps();
    await deps.sessaoTreinoRepository.save(
      SessaoTreino.create({ id: 'sessao_1', treinoId: null, treinoNomeSnapshot: 'Treino livre 15/09', dataHoraInicio: new Date() })
    );

    await deps.useCase.execute({ sessaoId: 'sessao_1', nome: 'Nome final digitado' });

    const sessaoAtualizada = await deps.sessaoTreinoRepository.findById('sessao_1');
    expect(sessaoAtualizada?.toPrimitives().treinoNomeSnapshot).toBe('Nome final digitado');
    expect(sessaoAtualizada?.toPrimitives().treinoId).toBeNull();
  });

  it('usa withTransaction quando a dependencia database e informada', async () => {
    const sessaoTreinoRepository = new InMemorySessaoTreinoRepository();
    const sessaoExercicioRepository = new InMemorySessaoExercicioRepository();
    const serieRegistradaRepository = new InMemorySerieRegistradaRepository();
    const treinoRepository = new InMemoryTreinoRepository();
    const treinoExercicioRepository = new InMemoryTreinoExercicioRepository();
    await sessaoTreinoRepository.save(
      SessaoTreino.create({ id: 'sessao_1', treinoId: null, treinoNomeSnapshot: 'Treino livre 15/09', dataHoraInicio: new Date() })
    );
    const chamadas: string[] = [];
    const database = {
      withTransaction: async <T>(fn: () => Promise<T>): Promise<T> => {
        chamadas.push('withTransaction');
        return fn();
      },
    };
    const useCase = new SalvarSessaoComoTreinoUseCase({
      sessaoTreinoRepository,
      sessaoExercicioRepository,
      serieRegistradaRepository,
      treinoRepository,
      treinoExercicioRepository,
      idGenerator: () => 'id_1',
      now: () => new Date('2026-09-15T10:00:00.000Z'),
      database,
    });

    await useCase.execute({ sessaoId: 'sessao_1', nome: 'Novo treino' });

    expect(chamadas).toEqual(['withTransaction']);
  });
});
