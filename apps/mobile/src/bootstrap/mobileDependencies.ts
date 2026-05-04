import { CreateExerciseUseCase } from '../application/exercises/use-cases/CreateExerciseUseCase';
import { DeleteExerciseUseCase } from '../application/exercises/use-cases/DeleteExerciseUseCase';
import { ListExercisesUseCase } from '../application/exercises/use-cases/ListExercisesUseCase';
import { UpdateExerciseUseCase } from '../application/exercises/use-cases/UpdateExerciseUseCase';
import { GetHistoricoExercicioUseCase } from '../application/historico/use-cases/GetHistoricoExercicioUseCase';
import { GetUltimaExecucaoValidaUseCase } from '../application/historico/use-cases/GetUltimaExecucaoValidaUseCase';
import { DeleteRegistroPesoUseCase } from '../application/peso/use-cases/DeleteRegistroPesoUseCase';
import { ListRegistrosPesoUseCase } from '../application/peso/use-cases/ListRegistrosPesoUseCase';
import { RegistrarPesoUseCase } from '../application/peso/use-cases/RegistrarPesoUseCase';
import { AddExercicioAoTreinoUseCase } from '../application/treinos/use-cases/AddExercicioAoTreinoUseCase';
import { CreateTreinoUseCase } from '../application/treinos/use-cases/CreateTreinoUseCase';
import { DeleteTreinoUseCase } from '../application/treinos/use-cases/DeleteTreinoUseCase';
import { ListTreinoExerciciosUseCase } from '../application/treinos/use-cases/ListTreinoExerciciosUseCase';
import { ListTreinosUseCase } from '../application/treinos/use-cases/ListTreinosUseCase';
import { RemoveExercicioDoTreinoUseCase } from '../application/treinos/use-cases/RemoveExercicioDoTreinoUseCase';
import { ReordenarExerciciosUseCase } from '../application/treinos/use-cases/ReordenarExerciciosUseCase';
import { AddExercicioASessaoUseCase } from '../application/sessoes/use-cases/AddExercicioASessaoUseCase';
import { DeleteSerieUseCase } from '../application/sessoes/use-cases/DeleteSerieUseCase';
import { FinalizarSessaoUseCase } from '../application/sessoes/use-cases/FinalizarSessaoUseCase';
import { GetSessaoAtivaUseCase } from '../application/sessoes/use-cases/GetSessaoAtivaUseCase';
import { GetSessaoDetalheUseCase } from '../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import { IniciarSessaoUseCase } from '../application/sessoes/use-cases/IniciarSessaoUseCase';
import { RegistrarSerieUseCase } from '../application/sessoes/use-cases/RegistrarSerieUseCase';
import { ToggleExercicioRealizadoUseCase } from '../application/sessoes/use-cases/ToggleExercicioRealizadoUseCase';
import { SQLiteHistoricoRepository } from '../infrastructure/historico/SQLiteHistoricoRepository';
import { SQLiteRegistroPesoRepository } from '../infrastructure/peso/SQLiteRegistroPesoRepository';
import { SQLiteExerciseRepository } from '../infrastructure/exercises/SQLiteExerciseRepository';
import { SQLiteTreinoExercicioRepository } from '../infrastructure/treinos/SQLiteTreinoExercicioRepository';
import { SQLiteTreinoRepository } from '../infrastructure/treinos/SQLiteTreinoRepository';
import { SQLiteSessaoTreinoRepository } from '../infrastructure/sessoes/SQLiteSessaoTreinoRepository';
import { SQLiteSessaoExercicioRepository } from '../infrastructure/sessoes/SQLiteSessaoExercicioRepository';
import { SQLiteSerieRegistradaRepository } from '../infrastructure/sessoes/SQLiteSerieRegistradaRepository';
import { ConsoleAppLogger } from '../infrastructure/logging/AppLogger';
import { ExpoSQLiteDatabaseClient } from '../infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient';
import { generateId } from '../shared/utils/generateId';

const logger = new ConsoleAppLogger();
const databaseClient = new ExpoSQLiteDatabaseClient('academia.db', logger);

const exerciseRepository = new SQLiteExerciseRepository(databaseClient);
const treinoRepository = new SQLiteTreinoRepository(databaseClient);
const treinoExercicioRepository = new SQLiteTreinoExercicioRepository(databaseClient);
const sessaoTreinoRepository = new SQLiteSessaoTreinoRepository(databaseClient);
const sessaoExercicioRepository = new SQLiteSessaoExercicioRepository(databaseClient);
const serieRegistradaRepository = new SQLiteSerieRegistradaRepository(databaseClient);
const historicoRepository = new SQLiteHistoricoRepository(databaseClient);
const registroPesoRepository = new SQLiteRegistroPesoRepository(databaseClient);

const listExercises = new ListExercisesUseCase(exerciseRepository);
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
    deleteExercise: new DeleteExerciseUseCase({ exerciseRepository }),
    listExercises,
    getUltimaExecucaoValida: new GetUltimaExecucaoValidaUseCase({ historicoRepository }),
    getHistoricoExercicio: new GetHistoricoExercicioUseCase({ historicoRepository }),
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
      listExercises,
      updateRecomendacoes: (id: string, series: number | null, execucoes: number | null) =>
        treinoExercicioRepository.updateRecomendacoes(id, series, execucoes),
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
};
