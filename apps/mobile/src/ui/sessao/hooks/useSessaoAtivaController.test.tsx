import { describe, expect, it, vi } from 'vitest';

import { ExercicioJaNaSessaoError } from '../../../application/sessoes/errors/ExercicioJaNaSessaoError';
import type { SessaoDetalhe } from '../../../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import type { SessaoTreinoPrimitives } from '../../../domain/sessoes/entities/SessaoTreino';
import { SessaoValidationError } from '../../../domain/sessoes/errors/SessaoValidationError';
import { act,renderHook } from '../../../test/renderHook';

import {
  type SessaoAtivaControllerDependencies,
  useSessaoAtivaController,
} from './useSessaoAtivaController';

// The i18n module pulls expo-localization and the SQLite database client
vi.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'pt-BR' }] }));
vi.mock('expo-sqlite', () => ({}));

const sessao: SessaoTreinoPrimitives = {
  id: 's1',
  treinoId: 't1',
  treinoNomeSnapshot: 'Treino A',
  dataHoraInicio: '2026-05-21T10:00:00.000Z',
  dataHoraFim: null,
  status: 'em_andamento',
};

const detalheBase: SessaoDetalhe = {
  sessao,
  exercicios: [
    {
      sessaoExercicio: {
        id: 'se1',
        sessaoTreinoId: 's1',
        exercicioId: 'ex1',
        ordem: 0,
        nomeSnapshot: 'Supino',
        grupoMuscularSnapshot: 'peito',
        categoriaSnapshot: 'composto',
        equipamentoSnapshot: 'barra',
        realizado: true,
        seriesRecomendadas: 3,
        execucoesRecomendadas: 10,
        cargaPadrao: 40,
        metodo: 'padrao',
        substituido: false,
        substituicaoMotivo: null,
      } as never,
      series: [],
      mediaOnline: null,
      mediaLocal: null,
    },
  ],
};

function makeDeps(overrides?: Partial<SessaoAtivaControllerDependencies>): SessaoAtivaControllerDependencies {
  return {
    getSessaoDetalhe: { execute: vi.fn().mockResolvedValue(detalheBase) } as never,
    registrarSerie: { execute: vi.fn().mockResolvedValue(undefined) } as never,
    registrarSegmento: { execute: vi.fn().mockResolvedValue(undefined) } as never,
    removerSegmento: { execute: vi.fn().mockResolvedValue(undefined) } as never,
    deleteSerie: { execute: vi.fn().mockResolvedValue(undefined) } as never,
    updateSerie: { execute: vi.fn().mockResolvedValue(undefined) } as never,
    toggleExercicioRealizado: { execute: vi.fn().mockResolvedValue(undefined) } as never,
    addExercicioASessao: { execute: vi.fn().mockResolvedValue(undefined) } as never,
    finalizarSessao: { execute: vi.fn().mockResolvedValue(undefined) } as never,
    cancelarSessao: { execute: vi.fn().mockResolvedValue(undefined) } as never,
    sugerirProgressao: {
      executeLote: vi.fn().mockResolvedValue(new Map()),
    } as never,
    sugerirSubstitutos: { execute: vi.fn().mockResolvedValue([]) } as never,
    substituirExercicio: { execute: vi.fn().mockResolvedValue(undefined) } as never,
    listExercises: { execute: vi.fn().mockResolvedValue([]) } as never,
    atualizarMetodoSessaoExercicio: vi.fn().mockResolvedValue(undefined),
    logger: { info: vi.fn(), error: vi.fn() } as never,
    ...overrides,
  };
}

async function flush() {
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
}

describe('useSessaoAtivaController', () => {
  it('loads detalhe and lista de exercicios on mount', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() =>
      useSessaoAtivaController(sessao, deps, () => undefined, () => undefined),
    );
    await flush();
    expect(result.current.detalhe).toEqual(detalheBase);
    expect(deps.listExercises.execute).not.toHaveBeenCalled(); // lazy: só na 1ª abertura do sheet
    expect(deps.sugerirProgressao.executeLote).toHaveBeenCalled();
  });

  it('onRegistrarSerie appends the serie incrementally without reloading the session', async () => {
    const novaSerie = {
      id: 'sr-nova', sessaoExercicioId: 'se1', ordem: 1, tipoSerie: 'valida',
      cargaKg: 50, repeticoes: 8, observacao: null,
      duracaoSegundos: null, distanciaMetros: null, intensidade: null,
    };
    const deps = makeDeps({
      registrarSerie: { execute: vi.fn().mockResolvedValue(novaSerie) } as never,
    });
    const { result } = await renderHook(() =>
      useSessaoAtivaController(sessao, deps, () => undefined, () => undefined),
    );
    await flush();
    await act(async () => {
      await result.current.onRegistrarSerie({
        sessaoExercicioId: 'se1',
        cargaKg: 50,
        repeticoes: 8,
        observacao: null,
      } as never);
    });
    expect(deps.registrarSerie.execute).toHaveBeenCalled();
    // sem reload completo: só a carga do mount
    expect(deps.getSessaoDetalhe.execute).toHaveBeenCalledTimes(1);
    expect(result.current.detalhe?.exercicios[0].series).toContainEqual(novaSerie);
    expect(result.current.errorMessage).toBeNull();
  });

  it('surfaces SessaoValidationError message from onRegistrarSerie', async () => {
    const deps = makeDeps({
      registrarSerie: {
        execute: vi.fn().mockRejectedValue(new SessaoValidationError('Carga invalida')),
      } as never,
    });
    const { result } = await renderHook(() =>
      useSessaoAtivaController(sessao, deps, () => undefined, () => undefined),
    );
    await flush();
    await act(async () => {
      await result.current.onRegistrarSerie({
        sessaoExercicioId: 'se1',
        cargaKg: -1,
        repeticoes: 8,
        observacao: null,
      } as never);
    });
    expect(result.current.errorMessage).toBe('Carga invalida');
  });

  it('uses generic message for unknown errors in onRegistrarSerie', async () => {
    const deps = makeDeps({
      registrarSerie: { execute: vi.fn().mockRejectedValue(new Error('db down')) } as never,
    });
    const { result } = await renderHook(() =>
      useSessaoAtivaController(sessao, deps, () => undefined, () => undefined),
    );
    await flush();
    await act(async () => {
      await result.current.onRegistrarSerie({
        sessaoExercicioId: 'se1',
        cargaKg: 50,
        repeticoes: 8,
        observacao: null,
      } as never);
    });
    expect(result.current.errorMessage).toBe('Não foi possível registrar a série.');
  });

  it('onFinalizar calls onFinalizado with the latest detalhe', async () => {
    const detalheFinal = { ...detalheBase, sessao: { ...sessao, status: 'finalizada' as const, dataHoraFim: '2026-05-21T11:00:00.000Z' } };
    const deps = makeDeps({
      getSessaoDetalhe: {
        execute: vi.fn().mockResolvedValueOnce(detalheBase).mockResolvedValueOnce(detalheFinal),
      } as never,
    });
    const onFinalizado = vi.fn();
    const { result } = await renderHook(() =>
      useSessaoAtivaController(sessao, deps, onFinalizado, () => undefined),
    );
    await flush();
    await act(async () => { await result.current.onFinalizar(); });
    expect(deps.finalizarSessao.execute).toHaveBeenCalledWith('s1');
    expect(onFinalizado).toHaveBeenCalledWith(detalheFinal);
  });

  it('onFinalizar surfaces error and clears finalizing state', async () => {
    const deps = makeDeps({
      finalizarSessao: { execute: vi.fn().mockRejectedValue(new Error('boom')) } as never,
    });
    const onFinalizado = vi.fn();
    const { result } = await renderHook(() =>
      useSessaoAtivaController(sessao, deps, onFinalizado, () => undefined),
    );
    await flush();
    await act(async () => { await result.current.onFinalizar(); });
    expect(onFinalizado).not.toHaveBeenCalled();
    expect(result.current.errorMessage).toBe('Não foi possível finalizar a sessão.');
    expect(result.current.isFinalizing).toBe(false);
  });

  it('onCancelar calls onCancelado on success', async () => {
    const deps = makeDeps();
    const onCancelado = vi.fn();
    const { result } = await renderHook(() =>
      useSessaoAtivaController(sessao, deps, () => undefined, onCancelado),
    );
    await flush();
    await act(async () => { await result.current.onCancelar(); });
    expect(deps.cancelarSessao.execute).toHaveBeenCalledWith('s1');
    expect(onCancelado).toHaveBeenCalled();
  });

  it('onAddExercicio surfaces ExercicioJaNaSessaoError', async () => {
    const deps = makeDeps({
      addExercicioASessao: {
        execute: vi.fn().mockRejectedValue(new ExercicioJaNaSessaoError('ex9')),
      } as never,
    });
    const { result } = await renderHook(() =>
      useSessaoAtivaController(sessao, deps, () => undefined, () => undefined),
    );
    await flush();
    await act(async () => { await result.current.onAddExercicio('ex9'); });
    expect(result.current.errorMessage).toMatch(/ja esta nesta sessao/);
  });

  it('onAbrirSubstituicao carrega candidatos', async () => {
    const candidatos = [{ exercicioId: 'ex2', nome: 'Crucifixo', score: 0.9 }];
    const deps = makeDeps({
      sugerirSubstitutos: { execute: vi.fn().mockResolvedValue(candidatos) } as never,
    });
    const { result } = await renderHook(() =>
      useSessaoAtivaController(sessao, deps, () => undefined, () => undefined),
    );
    await flush();
    await act(async () => { await result.current.onAbrirSubstituicao('se1'); });
    expect(result.current.sessaoExercicioSubstituindo).toBe('se1');
    expect(result.current.candidatosSubstituicao).toEqual(candidatos);
  });

  it('onFecharSubstituicao limpa estado', async () => {
    const deps = makeDeps({
      sugerirSubstitutos: { execute: vi.fn().mockResolvedValue([{ exercicioId: 'ex2' }]) } as never,
    });
    const { result } = await renderHook(() =>
      useSessaoAtivaController(sessao, deps, () => undefined, () => undefined),
    );
    await flush();
    await act(async () => { await result.current.onAbrirSubstituicao('se1'); });
    await act(async () => { result.current.onFecharSubstituicao(); });
    expect(result.current.sessaoExercicioSubstituindo).toBeNull();
    expect(result.current.candidatosSubstituicao).toEqual([]);
  });

  it('availableExercises filtra exercicios ja na sessao', async () => {
    const deps = makeDeps({
      listExercises: {
        execute: vi.fn().mockResolvedValue([
          { id: 'ex1', name: 'Supino' },
          { id: 'ex2', name: 'Agachamento' },
        ]),
      } as never,
    });
    const { result } = await renderHook(() =>
      useSessaoAtivaController(sessao, deps, () => undefined, () => undefined),
    );
    await flush();
    // catálogo é lazy: só carrega na primeira abertura do sheet
    expect(deps.listExercises.execute).not.toHaveBeenCalled();
    await act(async () => { result.current.onToggleShowAddExercise(); });
    await flush();
    expect(deps.listExercises.execute).toHaveBeenCalledTimes(1);
    expect(result.current.availableExercises.map((e) => e.id)).toEqual(['ex2']);
  });

  it('onRegistrarSeriesEmLote appends the series incrementally without reloading the session', async () => {
    const novaSerie = {
      id: 'sr-lote', sessaoExercicioId: 'se1', ordem: 1, tipoSerie: 'valida',
      cargaKg: 60, repeticoes: 8, observacao: null,
      duracaoSegundos: null, distanciaMetros: null, intensidade: null,
    };
    const deps = makeDeps({
      registrarSerie: { execute: vi.fn().mockResolvedValue(novaSerie) } as never,
    });
    const { result } = await renderHook(() =>
      useSessaoAtivaController(sessao, deps, () => undefined, () => undefined),
    );
    await flush();
    await act(async () => {
      await result.current.onRegistrarSeriesEmLote([
        { sessaoExercicioId: 'se1', cargaKg: 60, repeticoes: 8 } as never,
      ]);
    });
    expect(deps.registrarSerie.execute).toHaveBeenCalled();
    expect(deps.getSessaoDetalhe.execute).toHaveBeenCalledTimes(1);
    expect(result.current.detalhe?.exercicios[0].series).toContainEqual(novaSerie);
  });

  it('onRegistrarSeriesEmLote with segmentos reloads the detalhe', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() =>
      useSessaoAtivaController(sessao, deps, () => undefined, () => undefined),
    );
    await flush();
    await act(async () => {
      await result.current.onRegistrarSeriesEmLote([
        { sessaoExercicioId: 'se1', cargaKg: 60, repeticoes: 8, segmentos: [{ cargaKg: 50, repeticoes: 6 }] } as never,
      ]);
    });
    expect(deps.getSessaoDetalhe.execute).toHaveBeenCalledTimes(2);
  });

  it('onRegistrarSeriesEmLote surfaces a translated error on failure', async () => {
    const deps = makeDeps({
      registrarSerie: { execute: vi.fn().mockRejectedValue(new Error('boom')) } as never,
    });
    const { result } = await renderHook(() =>
      useSessaoAtivaController(sessao, deps, () => undefined, () => undefined),
    );
    await flush();
    await act(async () => {
      await result.current.onRegistrarSeriesEmLote([
        { sessaoExercicioId: 'se1', cargaKg: 60, repeticoes: 8 } as never,
      ]);
    });
    expect(result.current.errorMessage).toBe('Não foi possível registrar as séries.');
  });

  it('onRegistrarSerie with segmentos reloads the detalhe (segmentos vêm hidratados do use case)', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() =>
      useSessaoAtivaController(sessao, deps, () => undefined, () => undefined),
    );
    await flush();
    await act(async () => {
      await result.current.onRegistrarSerie({
        sessaoExercicioId: 'se1',
        cargaKg: 60,
        repeticoes: 8,
        segmentos: [{ cargaKg: 50, repeticoes: 6 }],
      } as never);
    });
    expect(deps.getSessaoDetalhe.execute).toHaveBeenCalledTimes(2);
  });

  it('onRegistrarSegmento recarrega o detalhe on success', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() =>
      useSessaoAtivaController(sessao, deps, () => undefined, () => undefined),
    );
    await flush();
    await act(async () => {
      await result.current.onRegistrarSegmento({ serieId: 'sr1', cargaKg: 50, repeticoes: 6 });
    });
    expect(deps.registrarSegmento.execute).toHaveBeenCalledWith({ serieId: 'sr1', cargaKg: 50, repeticoes: 6 });
    expect(deps.getSessaoDetalhe.execute).toHaveBeenCalledTimes(2);
    expect(result.current.errorMessage).toBeNull();
  });

  it('onRegistrarSegmento surfaces a translated error on failure', async () => {
    const deps = makeDeps({
      registrarSegmento: { execute: vi.fn().mockRejectedValue(new Error('boom')) } as never,
    });
    const { result } = await renderHook(() =>
      useSessaoAtivaController(sessao, deps, () => undefined, () => undefined),
    );
    await flush();
    await act(async () => {
      await result.current.onRegistrarSegmento({ serieId: 'sr1', cargaKg: 50, repeticoes: 6 });
    });
    expect(result.current.errorMessage).toBe('Não foi possível registrar o degrau.');
  });

  it('onRemoverSegmento recarrega o detalhe on success', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() =>
      useSessaoAtivaController(sessao, deps, () => undefined, () => undefined),
    );
    await flush();
    await act(async () => { await result.current.onRemoverSegmento('seg1'); });
    expect(deps.removerSegmento.execute).toHaveBeenCalledWith('seg1');
    expect(deps.getSessaoDetalhe.execute).toHaveBeenCalledTimes(2);
  });

  it('onRemoverSegmento surfaces a translated error on failure', async () => {
    const deps = makeDeps({
      removerSegmento: { execute: vi.fn().mockRejectedValue(new Error('boom')) } as never,
    });
    const { result } = await renderHook(() =>
      useSessaoAtivaController(sessao, deps, () => undefined, () => undefined),
    );
    await flush();
    await act(async () => { await result.current.onRemoverSegmento('seg1'); });
    expect(result.current.errorMessage).toBe('Não foi possível remover o degrau.');
  });
});
