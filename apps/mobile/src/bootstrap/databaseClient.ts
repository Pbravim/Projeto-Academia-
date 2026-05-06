import { ConsoleAppLogger } from '../infrastructure/logging/AppLogger';
import { ExpoSQLiteDatabaseClient } from '../infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient';

const logger = new ConsoleAppLogger();

// Singleton compartilhado entre mobileDependencies e o sistema de tema
export const databaseClient = new ExpoSQLiteDatabaseClient('academia.db', logger);
