import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import type { DiaSemana } from '../../domain/plano/entities/DiaSemana';
import { DIAS_SEMANA } from '../../domain/plano/entities/DiaSemana';
import type { PlanoSemanal, PlanoSemanalRepository } from '../../domain/plano/repositories/PlanoSemanalRepository';

export class SQLitePlanoSemanalRepository implements PlanoSemanalRepository {
  constructor(private readonly db: SQLiteDatabaseClient) {}

  async getPlano(): Promise<PlanoSemanal> {
    const rows = await this.db.getAll<{ dia_semana: string; treino_id: string | null }>(
      'SELECT dia_semana, treino_id FROM plano_semanal'
    );

    const plano = Object.fromEntries(DIAS_SEMANA.map((d) => [d, null])) as PlanoSemanal;
    for (const row of rows) {
      const dia = row.dia_semana as DiaSemana;
      if (DIAS_SEMANA.includes(dia)) {
        plano[dia] = row.treino_id ?? null;
      }
    }
    return plano;
  }

  async setDia(dia: DiaSemana, treinoId: string | null): Promise<void> {
    await this.db.run(
      'INSERT OR REPLACE INTO plano_semanal (dia_semana, treino_id) VALUES (?, ?)',
      [dia, treinoId]
    );
  }

  async clearTreino(treinoId: string): Promise<void> {
    await this.db.run('UPDATE plano_semanal SET treino_id = NULL WHERE treino_id = ?', [treinoId]);
  }
}
