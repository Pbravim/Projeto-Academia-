import type { SQLiteDatabaseClient } from '../../../infrastructure/persistence/sqlite/SQLiteDatabaseClient';

interface ResetHistoricoDependencies {
  database: SQLiteDatabaseClient;
}

/** Apaga todo o historico de sessoes, exercicios e series registradas. Nao remove treinos nem exercicios. */
export class ResetHistoricoUseCase {
  constructor(private readonly deps: ResetHistoricoDependencies) {}

  async execute(): Promise<void> {
    await this.deps.database.withTransaction(async () => {
      // First delete series from finalized sessions only
      await this.deps.database.run(
        `DELETE FROM series_registradas WHERE sessao_exercicio_id IN (
          SELECT se.id FROM sessao_exercicios se
          INNER JOIN sessao_treinos st ON se.sessao_treino_id = st.id
          WHERE st.status = 'finalizada'
        )`
      );

      // Then delete the exercise records from finalized sessions
      await this.deps.database.run(
        `DELETE FROM sessao_exercicios WHERE sessao_treino_id IN (
          SELECT id FROM sessao_treinos WHERE status = 'finalizada'
        )`
      );

      // Finally delete the finalized sessions
      await this.deps.database.run('DELETE FROM sessao_treinos WHERE status = ?', ['finalizada']);
    });
  }
}
