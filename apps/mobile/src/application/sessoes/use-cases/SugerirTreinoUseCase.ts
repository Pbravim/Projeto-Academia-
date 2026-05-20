import type { SQLiteDatabaseClient } from '../../../infrastructure/persistence/sqlite/SQLiteDatabaseClient';
import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import type { PlanoSemanalRepository } from '../../../domain/plano/repositories/PlanoSemanalRepository';
import { diaSemanaHoje } from '../../../domain/plano/entities/DiaSemana';

export type SugestaoFonte = 'plano' | 'rotacao';

export interface SugestaoTreino {
  treino: TreinoPrimitives;
  ultimaSessao: string | null;
  fonte: SugestaoFonte;
}

interface Deps {
  database: SQLiteDatabaseClient;
  planoRepository?: PlanoSemanalRepository;
}

export class SugerirTreinoUseCase {
  constructor(private readonly deps: Deps) {}

  async execute(): Promise<SugestaoTreino | null> {
    // Phase 2: check today's plan first
    if (this.deps.planoRepository) {
      const plano = await this.deps.planoRepository.getPlano();
      const treinoIdHoje = plano[diaSemanaHoje()];
      if (treinoIdHoje) {
        const row = await this.deps.database.getFirst<{
          id: string; name: string; objetivo: string | null;
          created_at: string; updated_at: string; ultima_sessao: string | null;
        }>(
          `SELECT t.id, t.name, t.objetivo, t.created_at, t.updated_at,
                  s.ultima_sessao
           FROM treinos t
           LEFT JOIN (
             SELECT treino_id, MAX(data_hora_inicio) AS ultima_sessao
             FROM sessao_treinos WHERE status = 'finalizada'
             GROUP BY treino_id
           ) s ON t.id = s.treino_id
           WHERE t.id = ?
             AND EXISTS (SELECT 1 FROM treino_exercicios te WHERE te.treino_id = t.id)`,
          [treinoIdHoje]
        );
        if (row) {
          return {
            treino: { id: row.id, name: row.name, objetivo: row.objetivo, createdAt: row.created_at, updatedAt: row.updated_at },
            ultimaSessao: row.ultima_sessao ?? null,
            fonte: 'plano',
          };
        }
      }
    }

    // Phase 1: suggest the treino done longest ago (or never done)
    const row = await this.deps.database.getFirst<{
      id: string; name: string; objetivo: string | null;
      created_at: string; updated_at: string; ultima_sessao: string | null;
    }>(
      `SELECT t.id, t.name, t.objetivo, t.created_at, t.updated_at,
              s.ultima_sessao
       FROM treinos t
       LEFT JOIN (
         SELECT treino_id, MAX(data_hora_inicio) AS ultima_sessao
         FROM sessao_treinos WHERE status = 'finalizada'
         GROUP BY treino_id
       ) s ON t.id = s.treino_id
       WHERE EXISTS (SELECT 1 FROM treino_exercicios te WHERE te.treino_id = t.id)
       ORDER BY
         CASE WHEN s.ultima_sessao IS NULL THEN 0 ELSE 1 END ASC,
         s.ultima_sessao ASC,
         t.created_at ASC
       LIMIT 1`
    );

    if (!row) return null;

    return {
      treino: { id: row.id, name: row.name, objetivo: row.objetivo, createdAt: row.created_at, updatedAt: row.updated_at },
      ultimaSessao: row.ultima_sessao ?? null,
      fonte: 'rotacao',
    };
  }
}
