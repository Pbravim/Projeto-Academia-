import { CreateExerciseUseCase } from '../application/exercises/use-cases/CreateExerciseUseCase';
import { DeleteExerciseUseCase } from '../application/exercises/use-cases/DeleteExerciseUseCase';
import { ListExercisesUseCase } from '../application/exercises/use-cases/ListExercisesUseCase';
import { UpdateExerciseUseCase } from '../application/exercises/use-cases/UpdateExerciseUseCase';
import { GetHistoricoExercicioUseCase } from '../application/historico/use-cases/GetHistoricoExercicioUseCase';
import { GetUltimaExecucaoValidaUseCase } from '../application/historico/use-cases/GetUltimaExecucaoValidaUseCase';
import { GetUltimasExecucoesValidasUseCase } from '../application/historico/use-cases/GetUltimasExecucoesValidasUseCase';
import { DeleteRegistroPesoUseCase } from '../application/peso/use-cases/DeleteRegistroPesoUseCase';
import { ListRegistrosPesoUseCase } from '../application/peso/use-cases/ListRegistrosPesoUseCase';
import { RegistrarPesoUseCase } from '../application/peso/use-cases/RegistrarPesoUseCase';
import { BaixarMidiaExercicioUseCase } from '../application/exercises/use-cases/BaixarMidiaExercicioUseCase';
import { BaixarMidiasTreinoUseCase } from '../application/exercises/use-cases/BaixarMidiasTreinoUseCase';
import type { MetodoExercicio } from '../domain/treinos/entities/TreinoExercicio';
import { AddExercicioAoTreinoUseCase } from '../application/treinos/use-cases/AddExercicioAoTreinoUseCase';
import { CreateTreinoUseCase } from '../application/treinos/use-cases/CreateTreinoUseCase';
import { DeleteTreinoUseCase } from '../application/treinos/use-cases/DeleteTreinoUseCase';
import { DuplicarTreinoUseCase } from '../application/treinos/use-cases/DuplicarTreinoUseCase';
import { ListTreinoExerciciosUseCase } from '../application/treinos/use-cases/ListTreinoExerciciosUseCase';
import { ListTreinosUseCase } from '../application/treinos/use-cases/ListTreinosUseCase';
import { RemoveExercicioDoTreinoUseCase } from '../application/treinos/use-cases/RemoveExercicioDoTreinoUseCase';
import { ReordenarExerciciosUseCase } from '../application/treinos/use-cases/ReordenarExerciciosUseCase';
import { UpdateTreinoUseCase } from '../application/treinos/use-cases/UpdateTreinoUseCase';
import { ArquivarSessaoUseCase } from '../application/dashboard/use-cases/ArquivarSessaoUseCase';
import { DesarquivarSessaoUseCase } from '../application/dashboard/use-cases/DesarquivarSessaoUseCase';
import { DeletarSessaoUseCase } from '../application/dashboard/use-cases/DeletarSessaoUseCase';
import { ExportarHistoricoUseCase } from '../application/dashboard/use-cases/ExportarHistoricoUseCase';
import { GetDashboardStatsUseCase } from '../application/dashboard/use-cases/GetDashboardStatsUseCase';
import { GetTreinoEvolucaoUseCase } from '../application/dashboard/use-cases/GetTreinoEvolucaoUseCase';
import { ResetHistoricoUseCase } from '../application/dashboard/use-cases/ResetHistoricoUseCase';
import { AddExercicioASessaoUseCase } from '../application/sessoes/use-cases/AddExercicioASessaoUseCase';
import { CancelarSessaoUseCase } from '../application/sessoes/use-cases/CancelarSessaoUseCase';
import { DeleteSerieUseCase } from '../application/sessoes/use-cases/DeleteSerieUseCase';
import { FinalizarSessaoUseCase } from '../application/sessoes/use-cases/FinalizarSessaoUseCase';
import { GetSessaoAtivaUseCase } from '../application/sessoes/use-cases/GetSessaoAtivaUseCase';
import { GetSessaoDetalheUseCase } from '../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import { IniciarSessaoUseCase } from '../application/sessoes/use-cases/IniciarSessaoUseCase';
import { RegistrarSerieUseCase } from '../application/sessoes/use-cases/RegistrarSerieUseCase';
import { SugerirProgressaoUseCase } from '../application/sessoes/use-cases/SugerirProgressaoUseCase';
import { SugerirSubstitutosUseCase } from '../application/sessoes/use-cases/SugerirSubstitutosUseCase';
import { SubstituirExercicioSessaoUseCase } from '../application/sessoes/use-cases/SubstituirExercicioSessaoUseCase';
import { ToggleExercicioRealizadoUseCase } from '../application/sessoes/use-cases/ToggleExercicioRealizadoUseCase';
import { SQLiteHistoricoRepository } from '../infrastructure/historico/SQLiteHistoricoRepository';
import { SQLiteRegistroPesoRepository } from '../infrastructure/peso/SQLiteRegistroPesoRepository';
import { SQLiteExerciseRepository } from '../infrastructure/exercises/SQLiteExerciseRepository';
import { SqliteDashboardRepository } from '../infrastructure/dashboard/SqliteDashboardRepository';
import { SQLiteTreinoExercicioRepository } from '../infrastructure/treinos/SQLiteTreinoExercicioRepository';
import { SQLiteTreinoRepository } from '../infrastructure/treinos/SQLiteTreinoRepository';
import { SQLiteSessaoTreinoRepository } from '../infrastructure/sessoes/SQLiteSessaoTreinoRepository';
import { SQLiteSessaoExercicioRepository } from '../infrastructure/sessoes/SQLiteSessaoExercicioRepository';
import { SQLiteSerieRegistradaRepository } from '../infrastructure/sessoes/SQLiteSerieRegistradaRepository';
import { ConsoleAppLogger } from '../infrastructure/logging/AppLogger';
import { generateId } from '../shared/utils/generateId';
import { databaseClient } from './databaseClient';

const logger = new ConsoleAppLogger();

const exerciseRepository = new SQLiteExerciseRepository(databaseClient);
const treinoRepository = new SQLiteTreinoRepository(databaseClient);
const treinoExercicioRepository = new SQLiteTreinoExercicioRepository(databaseClient);
const sessaoTreinoRepository = new SQLiteSessaoTreinoRepository(databaseClient);
const sessaoExercicioRepository = new SQLiteSessaoExercicioRepository(databaseClient);
const serieRegistradaRepository = new SQLiteSerieRegistradaRepository(databaseClient);
const historicoRepository = new SQLiteHistoricoRepository(databaseClient);
const registroPesoRepository = new SQLiteRegistroPesoRepository(databaseClient);
const dashboardRepository = new SqliteDashboardRepository(databaseClient);

const listExercises = new ListExercisesUseCase(exerciseRepository);
const baixarMidiaExercicio = new BaixarMidiaExercicioUseCase({ exerciseRepository });
const baixarMidiasTreino = new BaixarMidiasTreinoUseCase({
  exerciseRepository,
  treinoExercicioRepository,
  baixarMidia: baixarMidiaExercicio,
});
const listTreinos = new ListTreinosUseCase(treinoRepository);

export const mobileDependencies = {
  logger,

  exerciseCatalog: {
    createExercise: new CreateExerciseUseCase({
      exerciseRepository,
      idGenerator: () => generateId('exercise'),
      now: () => new Date(),
    }),
    updateExercise: new UpdateExerciseUseCase({
      exerciseRepository,
      now: () => new Date(),
    }),
    deleteExercise: new DeleteExerciseUseCase({
      exerciseRepository,
      treinoExercicioRepository,
      sessaoExercicioRepository,
      serieRegistradaRepository,
    }),
    listExercises,
    getUltimasExecucoesValidas: new GetUltimasExecucoesValidasUseCase({ historicoRepository }),
    getHistoricoExercicio: new GetHistoricoExercicioUseCase({ historicoRepository }),
    exerciseRepository,
    logger,
  },

  treinos: {
    list: {
      createTreino: new CreateTreinoUseCase({
        treinoRepository,
        idGenerator: () => generateId('treino'),
        now: () => new Date(),
      }),
      listTreinos,
      deleteTreino: new DeleteTreinoUseCase({ treinoRepository, treinoExercicioRepository }),
      duplicarTreino: new DuplicarTreinoUseCase({
        treinoRepository,
        treinoExercicioRepository,
        idGenerator: () => generateId('treino'),
        now: () => new Date(),
      }),
      logger,
    },
    detail: {
      listTreinoExercicios: new ListTreinoExerciciosUseCase(treinoExercicioRepository),
      addExercicioAoTreino: new AddExercicioAoTreinoUseCase({
        treinoRepository,
        treinoExercicioRepository,
        exerciseRepository,
        idGenerator: () => generateId('treino_exercicio'),
      }),
      removeExercicioDoTreino: new RemoveExercicioDoTreinoUseCase({ treinoExercicioRepository }),
      reordenarExercicios: new ReordenarExerciciosUseCase({ treinoRepository, treinoExercicioRepository }),
      updateTreino: new UpdateTreinoUseCase({ treinoRepository, now: () => new Date() }),
      listExercises,
      baixarMidiasTreino,
      updateRecomendacoes: (id: string, series: number | null, execucoes: number | null, cargaPadrao: number | null, tempoDescansoSegundos: number | null) =>
        treinoExercicioRepository.updateRecomendacoes(id, series, execucoes, cargaPadrao, tempoDescansoSegundos),
      updateMetodoGrupo: (id: string, metodo: MetodoExercicio, grupoId: string | null) =>
        treinoExercicioRepository.updateMetodoGrupo(id, metodo, grupoId),
      logger,
    },
  },

  sessao: {
    feature: {
      getSessaoAtiva: new GetSessaoAtivaUseCase(sessaoTreinoRepository),
      iniciarSessao: new IniciarSessaoUseCase({
        sessaoTreinoRepository,
        sessaoExercicioRepository,
        treinoRepository,
        treinoExercicioRepository,
        exerciseRepository,
        idGenerator: () => generateId('sessao'),
        now: () => new Date(),
      }),
      listTreinos,
      listTreinoExercicios: new ListTreinoExerciciosUseCase(treinoExercicioRepository),
      logger,
    },
    ativa: {
      getSessaoDetalhe: new GetSessaoDetalheUseCase({
        sessaoTreinoRepository,
        sessaoExercicioRepository,
        serieRegistradaRepository,
      }),
      registrarSerie: new RegistrarSerieUseCase({
        sessaoTreinoRepository,
        sessaoExercicioRepository,
        serieRegistradaRepository,
        treinoExercicioRepository,
        idGenerator: () => generateId('serie'),
      }),
      deleteSerie: new DeleteSerieUseCase({ serieRegistradaRepository }),
      toggleExercicioRealizado: new ToggleExercicioRealizadoUseCase({
        sessaoTreinoRepository,
        sessaoExercicioRepository,
      }),
      addExercicioASessao: new AddExercicioASessaoUseCase({
        sessaoTreinoRepository,
        sessaoExercicioRepository,
        exerciseRepository,
        idGenerator: () => generateId('sessao_exercicio'),
      }),
      finalizarSessao: new FinalizarSessaoUseCase({
        sessaoTreinoRepository,
        now: () => new Date(),
      }),
      cancelarSessao: new CancelarSessaoUseCase({
        sessaoTreinoRepository,
        sessaoExercicioRepository,
        serieRegistradaRepository,
      }),
      sugerirProgressao: new SugerirProgressaoUseCase({ historicoRepository }),
      sugerirSubstitutos: new SugerirSubstitutosUseCase({
        sessaoExercicioRepository,
        exerciseRepository,
        historicoRepository,
      }),
      substituirExercicio: new SubstituirExercicioSessaoUseCase({
        sessaoTreinoRepository,
        sessaoExercicioRepository,
        exerciseRepository,
      }),
      listExercises,
      logger,
    },
  },

  peso: {
    registrarPeso: new RegistrarPesoUseCase({
      registroPesoRepository,
      idGenerator: () => generateId('peso'),
      now: () => new Date(),
    }),
    listRegistrosPeso: new ListRegistrosPesoUseCase(registroPesoRepository),
    deleteRegistroPeso: new DeleteRegistroPesoUseCase(registroPesoRepository),
    logger,
  },

  dashboard: {
    getDashboardStats: new GetDashboardStatsUseCase({ dashboardRepository }),
    getTreinoEvolucao: new GetTreinoEvolucaoUseCase({ dashboardRepository }),
    resetHistorico: new ResetHistoricoUseCase({ database: databaseClient }),
    exportarHistorico: new ExportarHistoricoUseCase({ database: databaseClient }),
    arquivarSessao: new ArquivarSessaoUseCase({ dashboardRepository }),
    desarquivarSessao: new DesarquivarSessaoUseCase({ dashboardRepository }),
    deletarSessao: new DeletarSessaoUseCase({ dashboardRepository }),
    logger,
  },
};
