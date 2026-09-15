import { describe, expect, it } from 'vitest';

import { Exercise } from '../../../domain/exercises/entities/Exercise';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { SessaoValidationError } from '../../../domain/sessoes/errors/SessaoValidationError';
import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';
import { InMemorySerieRegistradaRepository } from '../../../infrastructure/sessoes/InMemorySerieRegistradaRepository';
import { InMemorySerieSegmentoRepository } from '../../../infrastructure/sessoes/InMemorySerieSegmentoRepository';
import { InMemorySessaoExercicioRepository } from '../../../infrastructure/sessoes/InMemorySessaoExercicioRepository';
import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { InMemoryTreinoExercicioRepository } from '../../../infrastructure/treinos/InMemoryTreinoExercicioRepository';
import { SessaoJaAtivaError } from '../errors/SessaoJaAtivaError';

import { AddExercicioASessaoUseCase } from './AddExercicioASessaoUseCase';
import { FinalizarSessaoUseCase } from './FinalizarSessaoUseCase';
import { IniciarSessaoLivreUseCase } from './IniciarSessaoLivreUseCase';
import { RegistrarSerieUseCase } from './RegistrarSerieUseCase';

function makeDeps() {
  const sessaoTreinoRepository = new InMemorySessaoTreinoRepository();
  let counter = 0;
  const useCase = new IniciarSessaoLivreUseCase({
    sessaoTreinoRepository,
    idGenerator: () => `sessao_${++counter}`,
    now: () => new Date('2026-09-15T10:00:00.000Z'),
  });
  return { sessaoTreinoRepository, useCase };
}

describe('IniciarSessaoLivreUseCase (#33 — D5)', () => {
  it('cria a sessao com treinoId null e o snapshot igual ao nome informado', async () => {
    const { useCase } = makeDeps();

    const sessao = await useCase.execute({ nome: 'Treino livre 15/09' });

    expect(sessao.treinoId).toBeNull();
    expect(sessao.treinoNomeSnapshot).toBe('Treino livre 15/09');
    expect(sessao.status).toBe('em_andamento');
  });

  it('rejeita iniciar quando ja existe sessao ativa', async () => {
    const { sessaoTreinoRepository, useCase } = makeDeps();
    await sessaoTreinoRepository.save(
      SessaoTreino.create({ id: 'sessao_existente', treinoId: null, treinoNomeSnapshot: 'Ja ativa', dataHoraInicio: new Date() })
    );

    await expect(useCase.execute({ nome: 'Treino livre 15/09' })).rejects.toBeInstanceOf(SessaoJaAtivaError);
  });

  it('rejeita nome vazio ou muito curto', async () => {
    const { useCase } = makeDeps();

    await expect(useCase.execute({ nome: '' })).rejects.toBeInstanceOf(SessaoValidationError);
    await expect(useCase.execute({ nome: ' a ' })).rejects.toBeInstanceOf(SessaoValidationError);
  });

  it('usa withTransaction quando a dependencia database e informada', async () => {
    const sessaoTreinoRepository = new InMemorySessaoTreinoRepository();
    const chamadas: string[] = [];
    const database = {
      withTransaction: async <T>(fn: () => Promise<T>): Promise<T> => {
        chamadas.push('withTransaction');
        return fn();
      },
    };
    const useCase = new IniciarSessaoLivreUseCase({
      sessaoTreinoRepository,
      idGenerator: () => 'sessao_1',
      now: () => new Date('2026-09-15T10:00:00.000Z'),
      database,
    });

    await useCase.execute({ nome: 'Treino livre 15/09' });

    expect(chamadas).toEqual(['withTransaction']);
  });

  it('integracao: iniciar livre -> adicionar exercicio -> registrar serie -> finalizar (criterio 1, #33)', async () => {
    const sessaoTreinoRepository = new InMemorySessaoTreinoRepository();
    const sessaoExercicioRepository = new InMemorySessaoExercicioRepository();
    const serieRegistradaRepository = new InMemorySerieRegistradaRepository();
    const serieSegmentoRepository = new InMemorySerieSegmentoRepository();
    const treinoExercicioRepository = new InMemoryTreinoExercicioRepository();
    const exerciseRepository = new InMemoryExerciseRepository();
    await exerciseRepository.save(
      Exercise.create({ id: 'ex_1', name: 'Supino', groupMuscles: ['Peito'], category: 'Musculação', createdAt: new Date('2026-01-01'), isCustom: false })
    );
    let counter = 0;
    const idGenerator = () => `id_${++counter}`;
    const now = () => new Date('2026-09-15T10:00:00.000Z');

    const iniciarSessaoLivre = new IniciarSessaoLivreUseCase({ sessaoTreinoRepository, idGenerator, now });
    const addExercicioASessao = new AddExercicioASessaoUseCase({
      sessaoTreinoRepository, sessaoExercicioRepository, exerciseRepository, idGenerator,
    });
    const registrarSerie = new RegistrarSerieUseCase({
      sessaoTreinoRepository, sessaoExercicioRepository, serieRegistradaRepository, serieSegmentoRepository, treinoExercicioRepository, idGenerator,
    });
    const finalizarSessao = new FinalizarSessaoUseCase({ sessaoTreinoRepository, now });

    const sessao = await iniciarSessaoLivre.execute({ nome: 'Treino livre 15/09' });
    const sessaoExercicio = await addExercicioASessao.execute({ sessaoId: sessao.id, exercicioId: 'ex_1' });
    await registrarSerie.execute({ sessaoExercicioId: sessaoExercicio.id, cargaKg: 60, repeticoes: 10 });
    const finalizada = await finalizarSessao.execute(sessao.id);

    expect(finalizada.status).toBe('finalizada');
    expect(finalizada.treinoId).toBeNull();
    const exercicios = await sessaoExercicioRepository.listBySessaoId(sessao.id);
    expect(exercicios).toHaveLength(1);
    const series = await serieRegistradaRepository.listBySessaoExercicioId(sessaoExercicio.id);
    expect(series).toHaveLength(1);
  });
});
