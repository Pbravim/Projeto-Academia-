import { describe, expect, it } from 'vitest';

import { SerieRegistrada } from '../../../domain/sessoes/entities/SerieRegistrada';
import { SessaoExercicio, type SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { Treino } from '../../../domain/treinos/entities/Treino';
import { TreinoExercicio } from '../../../domain/treinos/entities/TreinoExercicio';
import { InMemorySerieRegistradaRepository } from '../../../infrastructure/sessoes/InMemorySerieRegistradaRepository';
import { InMemorySessaoExercicioRepository } from '../../../infrastructure/sessoes/InMemorySessaoExercicioRepository';
import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { InMemoryTreinoExercicioRepository } from '../../../infrastructure/treinos/InMemoryTreinoExercicioRepository';
import { InMemoryTreinoRepository } from '../../../infrastructure/treinos/InMemoryTreinoRepository';

import { GetDecisaoFinalizacaoUseCase } from './GetDecisaoFinalizacaoUseCase';

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

function makeDeps() {
  const sessaoTreinoRepository = new InMemorySessaoTreinoRepository();
  const sessaoExercicioRepository = new InMemorySessaoExercicioRepository();
  const treinoRepository = new InMemoryTreinoRepository();
  const treinoExercicioRepository = new InMemoryTreinoExercicioRepository();
  const serieRegistradaRepository = new InMemorySerieRegistradaRepository();

  const useCase = new GetDecisaoFinalizacaoUseCase({
    sessaoTreinoRepository,
    sessaoExercicioRepository,
    treinoRepository,
    treinoExercicioRepository,
    serieRegistradaRepository,
  });

  return {
    sessaoTreinoRepository,
    sessaoExercicioRepository,
    treinoRepository,
    treinoExercicioRepository,
    serieRegistradaRepository,
    useCase,
  };
}

describe('GetDecisaoFinalizacaoUseCase (#33 — D6/D7)', () => {
  it('sessao livre com exercicios sugere salvar_como_treino', async () => {
    const deps = makeDeps();
    await deps.sessaoTreinoRepository.save(
      SessaoTreino.create({ id: 'sessao_1', treinoId: null, treinoNomeSnapshot: 'Treino livre 15/09', dataHoraInicio: new Date() })
    );
    await deps.sessaoExercicioRepository.save(SessaoExercicio.create(baseSessaoExercicio({})));

    const decisao = await deps.useCase.execute('sessao_1');

    expect(decisao).toEqual({ tipo: 'salvar_como_treino', nomeAtual: 'Treino livre 15/09', totalExercicios: 1 });
  });

  it('sessao livre sem exercicios nao sugere nada', async () => {
    const deps = makeDeps();
    await deps.sessaoTreinoRepository.save(
      SessaoTreino.create({ id: 'sessao_1', treinoId: null, treinoNomeSnapshot: 'Treino livre 15/09', dataHoraInicio: new Date() })
    );

    const decisao = await deps.useCase.execute('sessao_1');

    expect(decisao).toEqual({ tipo: 'nenhuma' });
  });

  it('sessao de treino com avulsos, exercicio do template e um substituido sugere adicionar_ao_treino so com os 2 avulsos', async () => {
    const deps = makeDeps();
    await deps.treinoRepository.save(
      Treino.create({ id: 'treino_1', name: 'Treino A', createdAt: new Date() })
    );
    await deps.treinoExercicioRepository.save(
      TreinoExercicio.create({
        id: 'te_1', treinoId: 'treino_1', exercicioId: 'ex_template', ordem: 1,
        seriesRecomendadas: null, execucoesRecomendadas: null, cargaPadrao: null, tempoDescansoSegundos: null,
        metodo: 'normal', grupoId: null, duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null,
      })
    );
    await deps.sessaoTreinoRepository.save(
      SessaoTreino.create({ id: 'sessao_1', treinoId: 'treino_1', treinoNomeSnapshot: 'Treino A', dataHoraInicio: new Date() })
    );
    // do template
    await deps.sessaoExercicioRepository.save(
      SessaoExercicio.create(baseSessaoExercicio({ id: 'se_template', exercicioId: 'ex_template', ordem: 1 }))
    );
    // avulso 1
    await deps.sessaoExercicioRepository.save(
      SessaoExercicio.create(baseSessaoExercicio({ id: 'se_avulso_1', exercicioId: 'ex_avulso_1', ordem: 2, nomeSnapshot: 'Rosca' }))
    );
    // avulso 2
    await deps.sessaoExercicioRepository.save(
      SessaoExercicio.create(baseSessaoExercicio({ id: 'se_avulso_2', exercicioId: 'ex_avulso_2', ordem: 3, nomeSnapshot: 'Triceps' }))
    );
    // substituido: exercicioId fora do template mas com substituidoPorExercicioId preenchido — nao e avulso (D7)
    await deps.sessaoExercicioRepository.save(
      SessaoExercicio.create(
        baseSessaoExercicio({ id: 'se_substituido', exercicioId: 'ex_substituto', ordem: 4, substituidoPorExercicioId: 'ex_original' })
      )
    );
    await deps.serieRegistradaRepository.save(
      SerieRegistrada.create({
        id: 'serie_1', sessaoExercicioId: 'se_avulso_1', tipoSerie: 'valida', ordem: 1, cargaKg: 20, repeticoes: 10,
      })
    );

    const decisao = await deps.useCase.execute('sessao_1');

    expect(decisao.tipo).toBe('adicionar_ao_treino');
    if (decisao.tipo === 'adicionar_ao_treino') {
      expect(decisao.treinoId).toBe('treino_1');
      expect(decisao.treinoNome).toBe('Treino A');
      expect(decisao.avulsos).toHaveLength(2);
      const avulso1 = decisao.avulsos.find((a) => a.exercicioId === 'ex_avulso_1');
      expect(avulso1).toEqual({ sessaoExercicioId: 'se_avulso_1', exercicioId: 'ex_avulso_1', nome: 'Rosca', seriesValidas: 1 });
      const avulso2 = decisao.avulsos.find((a) => a.exercicioId === 'ex_avulso_2');
      expect(avulso2?.seriesValidas).toBe(0);
    }
  });

  it('todos os exercicios da sessao ja estao no template: nenhuma decisao', async () => {
    const deps = makeDeps();
    await deps.treinoRepository.save(Treino.create({ id: 'treino_1', name: 'Treino A', createdAt: new Date() }));
    await deps.treinoExercicioRepository.save(
      TreinoExercicio.create({
        id: 'te_1', treinoId: 'treino_1', exercicioId: 'ex_template', ordem: 1,
        seriesRecomendadas: null, execucoesRecomendadas: null, cargaPadrao: null, tempoDescansoSegundos: null,
        metodo: 'normal', grupoId: null, duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null,
      })
    );
    await deps.sessaoTreinoRepository.save(
      SessaoTreino.create({ id: 'sessao_1', treinoId: 'treino_1', treinoNomeSnapshot: 'Treino A', dataHoraInicio: new Date() })
    );
    await deps.sessaoExercicioRepository.save(
      SessaoExercicio.create(baseSessaoExercicio({ id: 'se_template', exercicioId: 'ex_template', ordem: 1 }))
    );

    const decisao = await deps.useCase.execute('sessao_1');

    expect(decisao).toEqual({ tipo: 'nenhuma' });
  });

  it('treino apagado durante a sessao: nenhuma decisao', async () => {
    const deps = makeDeps();
    await deps.sessaoTreinoRepository.save(
      SessaoTreino.create({ id: 'sessao_1', treinoId: 'treino_inexistente', treinoNomeSnapshot: 'Treino A', dataHoraInicio: new Date() })
    );

    const decisao = await deps.useCase.execute('sessao_1');

    expect(decisao).toEqual({ tipo: 'nenhuma' });
  });

  it('sessao inexistente: nenhuma decisao', async () => {
    const deps = makeDeps();

    const decisao = await deps.useCase.execute('nao-existe');

    expect(decisao).toEqual({ tipo: 'nenhuma' });
  });
});
