import { CreateExerciseUseCase } from '../application/exercises/use-cases/CreateExerciseUseCase';
import { ListExercisesUseCase } from '../application/exercises/use-cases/ListExercisesUseCase';
import { SQLiteExerciseRepository } from '../infrastructure/exercises/SQLiteExerciseRepository';
import { ConsoleAppLogger } from '../infrastructure/logging/AppLogger';
import { ExpoSQLiteDatabaseClient } from '../infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient';
import { generateId } from '../shared/utils/generateId';

const logger = new ConsoleAppLogger();
const databaseClient = new ExpoSQLiteDatabaseClient('academia.db', logger);
const exerciseRepository = new SQLiteExerciseRepository(databaseClient);

export const mobileDependencies = {
  logger,
  exerciseCatalog: {
    createExercise: new CreateExerciseUseCase({
      exerciseRepository,
      idGenerator: () => generateId('exercise'),
      now: () => new Date(),
    }),
    listExercises: new ListExercisesUseCase(exerciseRepository),
    logger,
  },
};
