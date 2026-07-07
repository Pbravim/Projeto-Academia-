import type { SQLiteDatabaseClient } from '../../../infrastructure/persistence/sqlite/SQLiteDatabaseClient';

interface ResetHistoricoDependencies {
  database: SQLiteDatabaseClient;
}

const STATUS_RESETAVEIS = ['finalizada', 'cancelada'] as const;

/**
 * Apaga todo o historico de sessoes (finalizadas E canceladas), exercicios e series
 * registradas. Nao remove treinos nem exercicios, nem toca a sessao em andamento.
 *
 * Soft delete (tombstone + dirty), nunca DELETE fisico: as linhas precisam ser
 * pushadas como tombstones, senao o servidor ressuscita tudo no proximo pull.
 */
export class ResetHistoricoUseCase {
  constructor(private readonly deps: ResetHistoricoDependencies) {}

  async execute(): Promise<void> {
    const now = new Date().toISOString();
    const statuses = [...STATUS_RESETAVEIS];

    await this.deps.database.withTransaction(async () => {
      // Children first: series -> sessao_exercicios -> sessao_treinos.
      await this.deps.database.run(
        `UPDATE series_registradas SET deleted_at = ?, updated_at = ?, dirty = 1
         WHERE deleted_at IS NULL AND sessao_exercicio_id IN (
           SELECT se.id FROM sessao_exercicios se
           INNER JOIN sessao_treinos st ON se.sessao_treino_id = st.id
           WHERE st.status IN (?, ?)
         )`,
        [now, now, ...statuses],
      );

      await this.deps.database.run(
        `UPDATE sessao_exercicios SET deleted_at = ?, updated_at = ?, dirty = 1
         WHERE deleted_at IS NULL AND sessao_treino_id IN (
           SELECT id FROM sessao_treinos WHERE status IN (?, ?)
         )`,
        [now, now, ...statuses],
      );

      await this.deps.database.run(
        `UPDATE sessao_treinos SET deleted_at = ?, updated_at = ?, dirty = 1
         WHERE deleted_at IS NULL AND status IN (?, ?)`,
        [now, now, ...statuses],
      );
    });
  }
}
