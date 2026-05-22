import type { AppLogger } from '../../logging/AppLogger';
import type { SQLiteDatabaseClient } from './SQLiteDatabaseClient';

/**
 * Cleans up orphaned records that may exist due to incomplete transactions
 * or foreign key constraint violations. This runs on app bootstrap.
 *
 * Removes orphaned records from:
 * - exercise_alternatives (references exercicios)
 * - sessao_exercicios (references sessao_treinos)
 * - series_registradas (references sessao_exercicios)
 */
export class OrphanCleanupService {
  constructor(
    private readonly database: SQLiteDatabaseClient,
    private readonly logger: AppLogger
  ) {}

  async cleanupOrphans(): Promise<void> {
    try {
      await this.database.withTransaction(async () => {
        // Remove exercise_alternatives that reference non-existent exercises
        const exercicioDeletados = await this.deleteOrphanRecords(
          'DELETE FROM exercise_alternatives WHERE exercicio_id NOT IN (SELECT id FROM exercicios)',
          'exercise_alternatives'
        );

        // Remove sessao_exercicios that reference non-existent sessao_treinos
        const sessaoExercicioDeletados = await this.deleteOrphanRecords(
          'DELETE FROM sessao_exercicios WHERE sessao_treino_id NOT IN (SELECT id FROM sessao_treinos)',
          'sessao_exercicios'
        );

        // Remove series_registradas that reference non-existent sessao_exercicios
        const seriesDeletadas = await this.deleteOrphanRecords(
          'DELETE FROM series_registradas WHERE sessao_exercicio_id NOT IN (SELECT id FROM sessao_exercicios)',
          'series_registradas'
        );

        if (exercicioDeletados > 0 || sessaoExercicioDeletados > 0 || seriesDeletadas > 0) {
          this.logger.info('Orphan cleanup completed', {
            exercise_alternatives: exercicioDeletados,
            sessao_exercicios: sessaoExercicioDeletados,
            series_registradas: seriesDeletadas,
          });
        }
      });
    } catch (error) {
      this.logger.error('Error during orphan cleanup', { error });
      // Do not rethrow - cleanup failure should not prevent app startup
    }
  }

  private async deleteOrphanRecords(query: string, tableName: string): Promise<number> {
    // SQLite does not provide a way to get row count from DELETE statements directly
    // We would need to run a separate COUNT query before deletion
    try {
      await this.database.run(query);
      return 0; // Cannot determine exact count without additional queries
    } catch (error) {
      this.logger.error(`Error deleting orphans from ${tableName}`, { error });
      return 0;
    }
  }
}
