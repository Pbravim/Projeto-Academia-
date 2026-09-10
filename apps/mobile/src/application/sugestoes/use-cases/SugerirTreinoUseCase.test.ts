import { describe, expect, it } from 'vitest';

import type { DashboardRepository } from '../../../domain/dashboard/repositories/DashboardRepository';
import { diaSemanaHoje } from '../../../domain/plano/entities/DiaSemana';
import { InMemoryPlanoSemanalRepository } from '../../../infrastructure/plano/InMemoryPlanoSemanalRepository';

import { SugerirTreinoUseCase } from './SugerirTreinoUseCase';

const treinoRow = (id: string, ultimaSessao: string | null) => ({
  id,
  name: `Treino ${id}`,
  objetivo: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ultimaSessao,
});

function makeDashboard(overrides: Partial<DashboardRepository>): DashboardRepository {
  return {
    async findTreinoComUltimaSessao() { return null; },
    async findSugestaoRotacao() { return null; },
    ...overrides,
  } as unknown as DashboardRepository;
}

describe('SugerirTreinoUseCase', () => {
  it('sugere o treino do plano do dia quando há um definido', async () => {
    const plano = new InMemoryPlanoSemanalRepository();
    await plano.setDia(diaSemanaHoje(), 't1');
    const dashboardRepository = makeDashboard({
      async findTreinoComUltimaSessao(id: string) {
        return id === 't1' ? treinoRow('t1', '2026-02-01T10:00:00Z') : null;
      },
    });

    const useCase = new SugerirTreinoUseCase({ dashboardRepository, planoRepository: plano });
    const sugestao = await useCase.execute();

    expect(sugestao?.treino.id).toBe('t1');
    expect(sugestao?.fonte).toBe('plano');
  });

  it('cai na rotação quando não há plano para o dia', async () => {
    const plano = new InMemoryPlanoSemanalRepository();
    const dashboardRepository = makeDashboard({
      async findSugestaoRotacao() { return treinoRow('t2', null); },
    });

    const useCase = new SugerirTreinoUseCase({ dashboardRepository, planoRepository: plano });
    const sugestao = await useCase.execute();

    expect(sugestao?.treino.id).toBe('t2');
    expect(sugestao?.fonte).toBe('rotacao');
  });

  it('retorna null quando não há plano nem rotação', async () => {
    const useCase = new SugerirTreinoUseCase({ dashboardRepository: makeDashboard({}) });
    expect(await useCase.execute()).toBeNull();
  });
});
