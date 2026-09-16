import { describe, expect, it, vi } from 'vitest';

import { AdicionarExerciciosAoTreinoUseCase } from '../../../application/sessoes/use-cases/AdicionarExerciciosAoTreinoUseCase';
import type { DecisaoFinalizacao } from '../../../application/sessoes/use-cases/GetDecisaoFinalizacaoUseCase';
import { DuplicateTreinoError } from '../../../application/treinos/errors/DuplicateTreinoError';
import { SessaoExercicio, type SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { Treino } from '../../../domain/treinos/entities/Treino';
import { InMemorySerieRegistradaRepository } from '../../../infrastructure/sessoes/InMemorySerieRegistradaRepository';
import { InMemorySessaoExercicioRepository } from '../../../infrastructure/sessoes/InMemorySessaoExercicioRepository';
import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { InMemoryTreinoExercicioRepository } from '../../../infrastructure/treinos/InMemoryTreinoExercicioRepository';
import { InMemoryTreinoRepository } from '../../../infrastructure/treinos/InMemoryTreinoRepository';
import { act, renderHook } from '../../../test/renderHook';

import {
  type SessaoDecisaoControllerDependencies,
  useSessaoDecisaoController,
} from './useSessaoDecisaoController';

// The i18n module pulls expo-localization and the SQLite database client
vi.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'pt-BR' }] }));
vi.mock('expo-sqlite', () => ({}));

const decisaoSalvar: DecisaoFinalizacao = {
  tipo: 'salvar_como_treino',
  nomeAtual: 'Treino livre 13/09',
  totalExercicios: 2,
};

const decisaoAdicionar: DecisaoFinalizacao = {
  tipo: 'adicionar_ao_treino',
  treinoId: 't1',
  treinoNome: 'Treino A',
  avulsos: [
    { sessaoExercicioId: 'se1', exercicioId: 'ex1', nome: 'Supino', seriesValidas: 3 },
    { sessaoExercicioId: 'se2', exercicioId: 'ex2', nome: 'Remada', seriesValidas: 2 },
  ],
};

function makeDeps(overrides?: Partial<SessaoDecisaoControllerDependencies>): SessaoDecisaoControllerDependencies {
  return {
    salvarSessaoComoTreino: { execute: vi.fn().mockResolvedValue({ id: 'novo-treino' }) } as never,
    adicionarExerciciosAoTreino: { execute: vi.fn().mockResolvedValue([]) } as never,
    logger: { info: vi.fn(), error: vi.fn() } as never,
    ...overrides,
  };
}

describe('useSessaoDecisaoController', () => {
  it('pre-fills nome with nomeAtual for salvar_como_treino', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() =>
      useSessaoDecisaoController('s1', decisaoSalvar, deps, vi.fn()),
    );
    expect(result.current.nome).toBe('Treino livre 13/09');
  });

  it('starts with all avulsos selected for adicionar_ao_treino', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() =>
      useSessaoDecisaoController('s1', decisaoAdicionar, deps, vi.fn()),
    );
    expect(result.current.selecionados).toEqual(new Set(['se1', 'se2']));
  });

  it('onSalvarComoTreino calls the use case with the edited nome and concludes', async () => {
    const deps = makeDeps();
    const onConcluido = vi.fn();
    const { result } = await renderHook(() =>
      useSessaoDecisaoController('s1', decisaoSalvar, deps, onConcluido),
    );
    await act(async () => { result.current.onChangeNome('Treino de Pernas'); });
    await act(async () => { await result.current.onSalvarComoTreino(); });
    expect(deps.salvarSessaoComoTreino.execute).toHaveBeenCalledWith({ sessaoId: 's1', nome: 'Treino de Pernas' });
    expect(onConcluido).toHaveBeenCalledTimes(1);
  });

  it('onSalvarComoTreino surfaces nomeDuplicado on DuplicateTreinoError', async () => {
    const deps = makeDeps({
      salvarSessaoComoTreino: {
        execute: vi.fn().mockRejectedValue(new DuplicateTreinoError('Treino A')),
      } as never,
    });
    const onConcluido = vi.fn();
    const { result } = await renderHook(() =>
      useSessaoDecisaoController('s1', decisaoSalvar, deps, onConcluido),
    );
    await act(async () => { await result.current.onSalvarComoTreino(); });
    expect(result.current.errorMessage).toBe('Já existe um treino com esse nome.');
    expect(onConcluido).not.toHaveBeenCalled();
    expect(result.current.isSalvando).toBe(false);
  });

  it('onSalvarComoTreino surfaces a generic error for unknown failures', async () => {
    const deps = makeDeps({
      salvarSessaoComoTreino: { execute: vi.fn().mockRejectedValue(new Error('db down')) } as never,
    });
    const { result } = await renderHook(() =>
      useSessaoDecisaoController('s1', decisaoSalvar, deps, vi.fn()),
    );
    await act(async () => { await result.current.onSalvarComoTreino(); });
    expect(result.current.errorMessage).toBe('Não foi possível concluir a ação.');
  });

  it('onToggleSelecionado adds and removes ids from the selection', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() =>
      useSessaoDecisaoController('s1', decisaoAdicionar, deps, vi.fn()),
    );
    await act(async () => { result.current.onToggleSelecionado('se1'); });
    expect(result.current.selecionados).toEqual(new Set(['se2']));
    await act(async () => { result.current.onToggleSelecionado('se1'); });
    expect(result.current.selecionados).toEqual(new Set(['se1', 'se2']));
  });

  it('onAdicionarSelecionados calls the use case with the exercicioId (not sessaoExercicioId) of only the selected avulsos', async () => {
    const deps = makeDeps();
    const onConcluido = vi.fn();
    const { result } = await renderHook(() =>
      useSessaoDecisaoController('s1', decisaoAdicionar, deps, onConcluido),
    );
    await act(async () => { result.current.onToggleSelecionado('se2'); });
    await act(async () => { await result.current.onAdicionarSelecionados(); });
    expect(deps.adicionarExerciciosAoTreino.execute).toHaveBeenCalledWith({ sessaoId: 's1', exercicioIds: ['ex1'] });
    expect(onConcluido).toHaveBeenCalledTimes(1);
  });

  it('integration: creates the TreinoExercicio via the REAL AdicionarExerciciosAoTreinoUseCase with InMemory repos (achado 1, sev3, #58)', async () => {
    // LEARNINGS "Operação onda-33-38-44": controller que consome use case de outra
    // fatia precisa de >=1 teste contra o use case REAL — o fake unitário aceita
    // qualquer id e não denuncia a divergência sessaoExercicioId x exercicioId.
    const sessaoTreinoRepository = new InMemorySessaoTreinoRepository();
    const sessaoExercicioRepository = new InMemorySessaoExercicioRepository();
    const serieRegistradaRepository = new InMemorySerieRegistradaRepository();
    const treinoRepository = new InMemoryTreinoRepository();
    const treinoExercicioRepository = new InMemoryTreinoExercicioRepository();

    await treinoRepository.save(Treino.create({ id: 'treino_1', name: 'Treino A', createdAt: new Date() }));
    await sessaoTreinoRepository.save(
      SessaoTreino.create({ id: 'sessao_1', treinoId: 'treino_1', treinoNomeSnapshot: 'Treino A', dataHoraInicio: new Date() }),
    );

    function baseSessaoExercicio(overrides: Partial<SessaoExercicioPrimitives>): SessaoExercicioPrimitives {
      return {
        id: 'se_x', sessaoTreinoId: 'sessao_1', exercicioId: 'ex_x', ordem: 1,
        nomeSnapshot: 'Exercicio', grupoMuscularSnapshot: 'Peito', categoriaSnapshot: 'Composto',
        equipamentoSnapshot: null, musculoAlvoSnapshot: [], movementPatternSnapshot: null, realizado: true,
        seriesRecomendadas: null, execucoesRecomendadas: null, cargaPadrao: null, tempoDescansoSegundos: null,
        metodo: 'normal', grupoId: null, trackingTypeSnapshot: 'reps_load',
        duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null,
        substituidoPorExercicioId: null, substituicaoMotivo: null, nomeOriginalSnapshot: null,
        ...overrides,
      };
    }
    await sessaoExercicioRepository.save(SessaoExercicio.create(baseSessaoExercicio({ id: 'se1', exercicioId: 'ex1', ordem: 1, nomeSnapshot: 'Supino' })));
    await sessaoExercicioRepository.save(SessaoExercicio.create(baseSessaoExercicio({ id: 'se2', exercicioId: 'ex2', ordem: 2, nomeSnapshot: 'Remada' })));

    const adicionarExerciciosAoTreino = new AdicionarExerciciosAoTreinoUseCase({
      sessaoTreinoRepository,
      sessaoExercicioRepository,
      serieRegistradaRepository,
      treinoRepository,
      treinoExercicioRepository,
      idGenerator: () => 'te_1',
    });

    const decisao: DecisaoFinalizacao = {
      tipo: 'adicionar_ao_treino',
      treinoId: 'treino_1',
      treinoNome: 'Treino A',
      avulsos: [
        { sessaoExercicioId: 'se1', exercicioId: 'ex1', nome: 'Supino', seriesValidas: 3 },
        { sessaoExercicioId: 'se2', exercicioId: 'ex2', nome: 'Remada', seriesValidas: 2 },
      ],
    };

    const onConcluido = vi.fn();
    const { result } = await renderHook(() =>
      useSessaoDecisaoController('sessao_1', decisao, {
        salvarSessaoComoTreino: { execute: vi.fn() } as never,
        adicionarExerciciosAoTreino,
        logger: { info: vi.fn(), error: vi.fn() } as never,
      }, onConcluido),
    );

    // desmarca se2, mantendo so se1 selecionado
    await act(async () => { result.current.onToggleSelecionado('se2'); });
    await act(async () => { await result.current.onAdicionarSelecionados(); });

    expect(onConcluido).toHaveBeenCalledTimes(1);
    const criados = await treinoExercicioRepository.listByTreinoId('treino_1');
    expect(criados).toHaveLength(1);
    expect(criados[0].toPrimitives().exercicioId).toBe('ex1');
  });

  it('onAdicionarSelecionados surfaces a generic error on failure', async () => {
    const deps = makeDeps({
      adicionarExerciciosAoTreino: { execute: vi.fn().mockRejectedValue(new Error('boom')) } as never,
    });
    const onConcluido = vi.fn();
    const { result } = await renderHook(() =>
      useSessaoDecisaoController('s1', decisaoAdicionar, deps, onConcluido),
    );
    await act(async () => { await result.current.onAdicionarSelecionados(); });
    expect(result.current.errorMessage).toBe('Não foi possível concluir a ação.');
    expect(onConcluido).not.toHaveBeenCalled();
  });

  it('onIgnorar concludes without calling either use case ("nao salvar"/"manter")', async () => {
    const deps = makeDeps();
    const onConcluido = vi.fn();
    const { result } = await renderHook(() =>
      useSessaoDecisaoController('s1', decisaoSalvar, deps, onConcluido),
    );
    await act(async () => { result.current.onIgnorar(); });
    expect(onConcluido).toHaveBeenCalledTimes(1);
    expect(deps.salvarSessaoComoTreino.execute).not.toHaveBeenCalled();
    expect(deps.adicionarExerciciosAoTreino.execute).not.toHaveBeenCalled();
  });
});
