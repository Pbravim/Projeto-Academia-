import { describe, expect, it, vi } from 'vitest';

import type { DashboardRepository } from '../../../domain/dashboard/repositories/DashboardRepository';

import { SugerirTreinoUseCase } from './SugerirTreinoUseCase';

function makeDashboardRepo(overrides: Partial<DashboardRepository> = {}): DashboardRepository {
  return {
    getStats: vi.fn(),
    getEvolucaoExercicios: vi.fn(),
    arquivarSessao: vi.fn(),
    desarquivarSessao: vi.fn(),
    deletarSessao: vi.fn(),
    findSugestaoRotacao: vi.fn().mockResolvedValue(null),
    findTreinoComUltimaSessao: vi.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as DashboardRepository;
}

describe('SugerirTreinoUseCase', () => {
  it('returns null when findSugestaoRotacao returns null', async () => {
    const dashboardRepository = makeDashboardRepo();
    const result = await new SugerirTreinoUseCase({ dashboardRepository }).execute();
    expect(result).toBeNull();
  });

  it('returns a sugestao with fonte rotacao when findSugestaoRotacao returns a treino', async () => {
    const treinoRow = {
      id: 't1',
      name: 'Treino A',
      objetivo: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      ultimaSessao: null,
    };
    const dashboardRepository = makeDashboardRepo({
      findSugestaoRotacao: vi.fn().mockResolvedValue(treinoRow),
    });

    const result = await new SugerirTreinoUseCase({ dashboardRepository }).execute();
    expect(result).not.toBeNull();
    expect(result?.treino.id).toBe('t1');
    expect(result?.treino.name).toBe('Treino A');
    expect(result?.fonte).toBe('rotacao');
    expect(result?.ultimaSessao).toBeNull();
  });

  it('returns ultimaSessao from the repository row', async () => {
    const treinoRow = {
      id: 't2',
      name: 'Treino B',
      objetivo: 'Hipertrofia',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      ultimaSessao: '2026-05-30T09:00:00.000Z',
    };
    const dashboardRepository = makeDashboardRepo({
      findSugestaoRotacao: vi.fn().mockResolvedValue(treinoRow),
    });

    const result = await new SugerirTreinoUseCase({ dashboardRepository }).execute();
    expect(result?.ultimaSessao).toBe('2026-05-30T09:00:00.000Z');
  });

  it('uses planoRepository when provided and plano has a treino for today', async () => {
    const treinoRow = {
      id: 't3',
      name: 'Treino Plano',
      objetivo: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      ultimaSessao: null,
    };
    const findTreinoComUltimaSessao = vi.fn().mockResolvedValue(treinoRow);
    const findSugestaoRotacao = vi.fn().mockResolvedValue(null);
    const dashboardRepository = makeDashboardRepo({ findTreinoComUltimaSessao, findSugestaoRotacao });

    // Build a planoRepository that returns a day-of-week map with today's entry
    const { diaSemanaHoje } = await import('../../../domain/plano/entities/DiaSemana');
    const hoje = diaSemanaHoje();
    const plano = { segunda: null, terca: null, quarta: null, quinta: null, sexta: null, sabado: null, domingo: null, [hoje]: 't3' };
    const planoRepository = { getPlano: vi.fn().mockResolvedValue(plano) } as never;

    const result = await new SugerirTreinoUseCase({ dashboardRepository, planoRepository }).execute();
    expect(result?.treino.id).toBe('t3');
    expect(result?.fonte).toBe('plano');
  });
});
