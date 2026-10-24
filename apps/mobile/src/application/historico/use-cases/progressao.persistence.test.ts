import { describe, expect, it } from 'vitest';

import { SessaoExercicio } from '../../../domain/sessoes/entities/SessaoExercicio';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { SQLiteHistoricoRepository } from '../../../infrastructure/historico/SQLiteHistoricoRepository';
import { SQLiteSerieRegistradaRepository } from '../../../infrastructure/sessoes/SQLiteSerieRegistradaRepository';
import { SQLiteSerieSegmentoRepository } from '../../../infrastructure/sessoes/SQLiteSerieSegmentoRepository';
import { SQLiteSessaoExercicioRepository } from '../../../infrastructure/sessoes/SQLiteSessaoExercicioRepository';
import { SQLiteSessaoTreinoRepository } from '../../../infrastructure/sessoes/SQLiteSessaoTreinoRepository';
import { SQLiteTreinoExercicioRepository } from '../../../infrastructure/treinos/SQLiteTreinoExercicioRepository';
import { createTestDatabase } from '../../../test/db-setup';
import { progressaoDetalhe } from '../../../test/progressaoFixtures';
import { buildProgressaoExercicioViewModel } from '../../../ui/sessao/presenters/buildProgressaoExercicioViewModel';
import { RegistrarSerieUseCase } from '../../sessoes/use-cases/RegistrarSerieUseCase';

import { GetHistoricoAnteriorDaSessaoUseCase } from './GetHistoricoAnteriorDaSessaoUseCase';

describe('saved exercise progression', () => {
  it('reloads previous weights/reps from SQLite after finalization and compares the next workout', async () => {
    const db = createTestDatabase();
    const sessaoTreinoRepository = new SQLiteSessaoTreinoRepository(db);
    const sessaoExercicioRepository = new SQLiteSessaoExercicioRepository(db);
    const serieRegistradaRepository = new SQLiteSerieRegistradaRepository(db);
    await sessaoTreinoRepository.save(SessaoTreino.create({
      id: 'previous', treinoId: null, treinoNomeSnapshot: 'Supino', dataHoraInicio: new Date('2026-10-01T10:00:00Z'),
    }));
    await sessaoExercicioRepository.save(SessaoExercicio.restore({
      ...progressaoDetalhe().exercicios[0].sessaoExercicio, sessaoTreinoId: 'previous',
    }));
    const registrar = new RegistrarSerieUseCase({
      sessaoTreinoRepository, sessaoExercicioRepository, serieRegistradaRepository,
      serieSegmentoRepository: new SQLiteSerieSegmentoRepository(db),
      treinoExercicioRepository: new SQLiteTreinoExercicioRepository(db), idGenerator: () => 'saved-set', database: db,
    });
    await registrar.execute({ sessaoExercicioId: 'se', cargaKg: 60, repeticoes: 6 });
    await db.run("UPDATE sessao_treinos SET status = 'finalizada', data_hora_fim = ? WHERE id = ?", ['2026-10-01T11:00:00Z', 'previous']);

    // A fresh repository instance reads persisted data, rather than a controller's cache.
    const history = await new GetHistoricoAnteriorDaSessaoUseCase(new SQLiteHistoricoRepository(db)).execute({
      sessaoId: 'current', inicio: '2026-10-24T10:00:00Z', exercicioIds: ['exercise'],
    });
    expect(history.get('exercise')?.[0].series[0]).toMatchObject({ cargaKg: 60, repeticoes: 6 });
    const vm = buildProgressaoExercicioViewModel(progressaoDetalhe().exercicios[0].series, history.get('exercise')!, 'en-US');
    expect(vm.topSets).toEqual(['60 kg × 6']);
    expect(vm.prs.map((pr) => pr.tipo)).toEqual(['carga', 'e1rm']);
  });
});
