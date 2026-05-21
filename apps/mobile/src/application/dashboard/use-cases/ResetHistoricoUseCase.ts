import type { SQLiteDatabaseClient } from '../../../infrastructure/persistence/sqlite/SQLiteDatabaseClient';

interface ResetHistoricoDependencies {
  database: SQLiteDatabaseClient;
}

/** Apaga todo o historico de sessoes, exercicios e series registradas. Nao remove treinos nem exercicios. */
export class ResetHistoricoUseCase {
  constructor(private readonly deps: ResetHistoricoDependencies) {}

  async execute(): Promise<void> {
    await this.deps.database.withTransaction(async () => {
      await this.deps.database.run('DELETE FROM series_registradas');
      await this.deps.database.run('DELETE FROM sessao_exercicios');
      await this.deps.database.run('DELETE FROM sessao_treinos');
    });
  }
}
