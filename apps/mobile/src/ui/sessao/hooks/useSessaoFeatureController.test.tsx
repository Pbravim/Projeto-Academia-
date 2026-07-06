import { describe, it, expect, vi } from 'vitest';

// The i18n module pulls expo-localization and the SQLite database client
vi.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'pt-BR' }] }));
vi.mock('expo-sqlite', () => ({}));

import { renderHook, act } from '../../../test/renderHook';
import { useSessaoFeatureController, type SessaoFeatureControllerDependencies } from './useSessaoFeatureController';
import type { SessaoTreinoPrimitives } from '../../../domain/sessoes/entities/SessaoTreino';
import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import type { SessaoDetalhe } from '../../../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import { TreinoSemExerciciosError } from '../../../application/sessoes/errors/TreinoSemExerciciosError';

const treinoA: TreinoPrimitives = {
  id: 't1',
  name: 'Treino A',
  objetivo: 'forca',
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
};
const treinoB: TreinoPrimitives = {
  id: 't2',
  name: 'Treino B',
  objetivo: null,
  createdAt: '2026-01-02T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
};

const sessaoAtivaFake: SessaoTreinoPrimitives = {
  id: 's1',
  treinoId: 't1',
  treinoNomeSnapshot: 'Treino A',
  dataHoraInicio: '2026-05-21T10:00:00.000Z',
  dataHoraFim: null,
  status: 'em_andamento',
};

function makeDeps(overrides?: Partial<SessaoFeatureControllerDependencies>): SessaoFeatureControllerDependencies {
  return {
    getSessaoAtiva: { execute: vi.fn().mockResolvedValue(null) } as never,
    iniciarSessao: { execute: vi.fn().mockResolvedValue(sessaoAtivaFake) } as never,
    sugerirTreino: { execute: vi.fn().mockResolvedValue(null) } as never,
    listTreinos: { execute: vi.fn().mockResolvedValue([treinoA, treinoB]) } as never,
    listTreinoExercicios: {
      execute: vi.fn().mockImplementation(async (id: string) => (id === 't1' ? [{ id: 'e1' }] : [])),
    } as never,
    logger: { info: vi.fn(), error: vi.fn() } as never,
    ...overrides,
  };
}

async function flush() {
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
}

describe('useSessaoFeatureController', () => {
  it('transitions to inicio after load when no sessao ativa', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() => useSessaoFeatureController(deps));
    await flush();
    expect(result.current.view).toBe('inicio');
    expect(result.current.treinos).toEqual([treinoA, treinoB]);
    expect(result.current.treinosComExercicios.has('t1')).toBe(true);
    expect(result.current.treinosComExercicios.has('t2')).toBe(false);
  });

  it('transitions to ativa when there is an existing sessao', async () => {
    const deps = makeDeps({
      getSessaoAtiva: { execute: vi.fn().mockResolvedValue(sessaoAtivaFake) } as never,
    });
    const { result } = await renderHook(() => useSessaoFeatureController(deps));
    await flush();
    expect(result.current.view).toBe('ativa');
    expect(result.current.sessaoAtiva).toEqual(sessaoAtivaFake);
  });

  it('iniciarSessao success sets view to ativa', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() => useSessaoFeatureController(deps));
    await flush();
    await act(async () => { await result.current.onIniciarSessao('t1'); });
    expect(result.current.view).toBe('ativa');
    expect(result.current.sessaoAtiva).toEqual(sessaoAtivaFake);
    expect(result.current.errorMessage).toBeNull();
  });

  it('iniciarSessao with TreinoSemExerciciosError surfaces the message', async () => {
    const deps = makeDeps({
      iniciarSessao: { execute: vi.fn().mockRejectedValue(new TreinoSemExerciciosError()) } as never,
    });
    const { result } = await renderHook(() => useSessaoFeatureController(deps));
    await flush();
    await act(async () => { await result.current.onIniciarSessao('t2'); });
    expect(result.current.view).toBe('inicio');
    expect(result.current.errorMessage).toMatch(/exerc/i);
    expect(result.current.isIniciando).toBe(false);
  });

  it('iniciarSessao with unknown error shows generic message', async () => {
    const deps = makeDeps({
      iniciarSessao: { execute: vi.fn().mockRejectedValue(new Error('boom')) } as never,
    });
    const { result } = await renderHook(() => useSessaoFeatureController(deps));
    await flush();
    await act(async () => { await result.current.onIniciarSessao('t1'); });
    expect(result.current.errorMessage).toBe('Não foi possível iniciar a sessão.');
  });

  it('onSessaoFinalizada moves to resumo and clears sessao ativa', async () => {
    const deps = makeDeps({
      getSessaoAtiva: { execute: vi.fn().mockResolvedValue(sessaoAtivaFake) } as never,
    });
    const { result } = await renderHook(() => useSessaoFeatureController(deps));
    await flush();
    const detalhe = { sessao: sessaoAtivaFake, exercicios: [] } as unknown as SessaoDetalhe;
    await act(async () => { result.current.onSessaoFinalizada(detalhe); });
    expect(result.current.view).toBe('resumo');
    expect(result.current.sessaoAtiva).toBeNull();
    expect(result.current.sessaoResumo).toBe(detalhe);
  });

  it('onSessaoCancelada moves to inicio', async () => {
    const deps = makeDeps({
      getSessaoAtiva: { execute: vi.fn().mockResolvedValue(sessaoAtivaFake) } as never,
    });
    const { result } = await renderHook(() => useSessaoFeatureController(deps));
    await flush();
    await act(async () => { result.current.onSessaoCancelada(); });
    expect(result.current.view).toBe('inicio');
    expect(result.current.sessaoAtiva).toBeNull();
  });

  it('onFecharResumo clears resumo and reloads', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() => useSessaoFeatureController(deps));
    await flush();
    const detalhe = { sessao: sessaoAtivaFake, exercicios: [] } as unknown as SessaoDetalhe;
    await act(async () => { result.current.onSessaoFinalizada(detalhe); });
    expect(result.current.view).toBe('resumo');
    await act(async () => { result.current.onFecharResumo(); });
    await flush();
    expect(result.current.sessaoResumo).toBeNull();
    expect(deps.getSessaoAtiva.execute).toHaveBeenCalledTimes(2);
  });

  it('logs and falls back to inicio when load fails', async () => {
    const deps = makeDeps({
      listTreinos: { execute: vi.fn().mockRejectedValue(new Error('db')) } as never,
    });
    const { result } = await renderHook(() => useSessaoFeatureController(deps));
    await flush();
    expect(result.current.view).toBe('inicio');
    expect(deps.logger.error).toHaveBeenCalled();
  });
});
