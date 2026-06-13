import { describe, expect, it } from 'vitest';
import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { InMemorySessaoExercicioRepository } from '../../../infrastructure/sessoes/InMemorySessaoExercicioRepository';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { SessaoExercicio } from '../../../domain/sessoes/entities/SessaoExercicio';
import { ToggleExercicioRealizadoUseCase } from './ToggleExercicioRealizadoUseCase';

function makeSessao(id = 's1') {
  return SessaoTreino.create({
    id,
    treinoId: 't1',
    treinoNomeSnapshot: 'Treino A',
    dataHoraInicio: new Date('2026-01-01T10:00:00Z'),
  });
}

function makeSE(id: string, sessaoId: string) {
  return SessaoExercicio.create({
    id,
    sessaoTreinoId: sessaoId,
    exercicioId: 'ex1',
    ordem: 0,
    nomeSnapshot: 'Supino reto',
    grupoMuscularSnapshot: 'Peito',
    categoriaSnapshot: 'Composto',
    equipamentoSnapshot: null,
    musculoAlvoSnapshot: [],
    movementPatternSnapshot: null,
    realizado: false,
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
  });
}

describe('ToggleExercicioRealizadoUseCase', () => {
  it('toggles realizado from false to true', async () => {
    const sessaoRepo = new InMemorySessaoTreinoRepository();
    const seRepo = new InMemorySessaoExercicioRepository();
    const sessao = makeSessao();
    const se = makeSE('se1', sessao.toPrimitives().id);
    await sessaoRepo.save(sessao);
    await seRepo.save(se);

    const useCase = new ToggleExercicioRealizadoUseCase({
      sessaoTreinoRepository: sessaoRepo,
      sessaoExercicioRepository: seRepo,
    });
    const result = await useCase.execute('se1');
    expect(result.realizado).toBe(true);
  });

  it('toggles realizado back to false on second call', async () => {
    const sessaoRepo = new InMemorySessaoTreinoRepository();
    const seRepo = new InMemorySessaoExercicioRepository();
    const sessao = makeSessao();
    const se = makeSE('se1', sessao.toPrimitives().id);
    await sessaoRepo.save(sessao);
    await seRepo.save(se);

    const useCase = new ToggleExercicioRealizadoUseCase({
      sessaoTreinoRepository: sessaoRepo,
      sessaoExercicioRepository: seRepo,
    });
    await useCase.execute('se1');
    const result = await useCase.execute('se1');
    expect(result.realizado).toBe(false);
  });

  it('throws when sessaoExercicio not found', async () => {
    const sessaoRepo = new InMemorySessaoTreinoRepository();
    const seRepo = new InMemorySessaoExercicioRepository();
    const useCase = new ToggleExercicioRealizadoUseCase({
      sessaoTreinoRepository: sessaoRepo,
      sessaoExercicioRepository: seRepo,
    });
    await expect(useCase.execute('nonexistent')).rejects.toThrow();
  });

  it('throws SessaoEncerradaError when session is finalized', async () => {
    const sessaoRepo = new InMemorySessaoTreinoRepository();
    const seRepo = new InMemorySessaoExercicioRepository();
    const sessao = makeSessao();
    const finalizada = sessao.finalizar(new Date('2026-01-01T11:00:00Z'));
    const se = makeSE('se1', sessao.toPrimitives().id);
    await sessaoRepo.save(finalizada);
    await seRepo.save(se);

    const useCase = new ToggleExercicioRealizadoUseCase({
      sessaoTreinoRepository: sessaoRepo,
      sessaoExercicioRepository: seRepo,
    });
    await expect(useCase.execute('se1')).rejects.toThrow();
  });
});
