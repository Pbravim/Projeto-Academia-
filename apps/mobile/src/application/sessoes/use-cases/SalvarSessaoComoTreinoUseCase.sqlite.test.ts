import { beforeEach, describe, expect, it } from 'vitest';

import { SerieRegistrada } from '../../../domain/sessoes/entities/SerieRegistrada';
import { SessaoExercicio, type SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import type { SQLiteDatabaseClient } from '../../../infrastructure/persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteSerieRegistradaRepository } from '../../../infrastructure/sessoes/SQLiteSerieRegistradaRepository';
import { SQLiteSessaoExercicioRepository } from '../../../infrastructure/sessoes/SQLiteSessaoExercicioRepository';
import { SQLiteSessaoTreinoRepository } from '../../../infrastructure/sessoes/SQLiteSessaoTreinoRepository';
import { SQLiteTreinoExercicioRepository } from '../../../infrastructure/treinos/SQLiteTreinoExercicioRepository';
import { SQLiteTreinoRepository } from '../../../infrastructure/treinos/SQLiteTreinoRepository';
import { createTestDatabase } from '../../../test/db-setup';

import { SalvarSessaoComoTreinoUseCase } from './SalvarSessaoComoTreinoUseCase';

let db: SQLiteDatabaseClient;

function baseSessaoExercicio(overrides: Partial<SessaoExercicioPrimitives>): SessaoExercicioPrimitives {
  return {
    id: 'se_1',
    sessaoTreinoId: 'sessao_1',
    exercicioId: 'ex-1',
    ordem: 1,
    nomeSnapshot: 'Agachamento',
    grupoMuscularSnapshot: 'Pernas',
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

beforeEach(async () => {
  db = createTestDatabase();
  await db.run(
    `INSERT INTO exercises (id, name, normalized_name, group_muscle, category, equipment, load_unit, is_custom, created_at, updated_at) VALUES
     ('ex-1', 'Agachamento', 'agachamento', 'Pernas', 'Composto', NULL, 'kg', 0, '2026-07-01T10:00:00.000Z', '2026-07-01T10:00:00.000Z')`
  );
});

/**
 * LEARNINGS "InMemory sem UNIQUE": `treino_exercicios` tem UNIQUE(treino_id, exercicio_id) e
 * `SQLiteTreinoExercicioRepository.save` usa INSERT OR REPLACE. Uma sessao pode ter o mesmo
 * exercicioId duas vezes (substituicao de exercicio no meio da sessao) — o
 * `InMemoryTreinoExercicioRepository` nao reproduz a UNIQUE (indexa por id), entao so o SQLite
 * real prova que o dedupe roda ANTES da 1a escrita e nao perde nenhuma linha em silencio.
 */
describe('SalvarSessaoComoTreinoUseCase (SQLite real) — dedupe por exercicioId antes da 1a escrita', () => {
  it('sessao com exercicioId repetido grava so 1 TreinoExercicio, com os dados da 1a ocorrencia', async () => {
    const sessaoTreinoRepository = new SQLiteSessaoTreinoRepository(db);
    const sessaoExercicioRepository = new SQLiteSessaoExercicioRepository(db);
    const serieRegistradaRepository = new SQLiteSerieRegistradaRepository(db);
    const treinoRepository = new SQLiteTreinoRepository(db);
    const treinoExercicioRepository = new SQLiteTreinoExercicioRepository(db);

    await sessaoTreinoRepository.save(
      SessaoTreino.create({ id: 'sessao_1', treinoId: null, treinoNomeSnapshot: 'Treino livre 15/09', dataHoraInicio: new Date('2026-09-15T10:00:00.000Z') })
    );
    await sessaoExercicioRepository.save(
      SessaoExercicio.create(baseSessaoExercicio({ id: 'se_1', exercicioId: 'ex-1', ordem: 1, tempoDescansoSegundos: 60 }))
    );
    // Substituicao no meio da sessao: o exercicio original voltou a aparecer com outro sessaoExercicioId.
    await sessaoExercicioRepository.save(
      SessaoExercicio.create(baseSessaoExercicio({ id: 'se_2', exercicioId: 'ex-1', ordem: 2, tempoDescansoSegundos: 30 }))
    );
    await serieRegistradaRepository.save(
      SerieRegistrada.create({ id: 'serie_1', sessaoExercicioId: 'se_1', tipoSerie: 'valida', ordem: 1, cargaKg: 60, repeticoes: 10 })
    );

    const useCase = new SalvarSessaoComoTreinoUseCase({
      sessaoTreinoRepository,
      sessaoExercicioRepository,
      serieRegistradaRepository,
      treinoRepository,
      treinoExercicioRepository,
      idGenerator: () => `te-${Math.random()}`,
      now: () => new Date('2026-09-15T10:00:00.000Z'),
      database: db,
    });

    const treino = await useCase.execute({ sessaoId: 'sessao_1', nome: 'Treino dedupe' });

    const rows = await db.getAll<{ exercicio_id: string; tempo_descanso_segundos: number }>(
      'SELECT exercicio_id, tempo_descanso_segundos FROM treino_exercicios WHERE treino_id = ?',
      [treino.id]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].exercicio_id).toBe('ex-1');
    expect(rows[0].tempo_descanso_segundos).toBe(60);
  });
});
