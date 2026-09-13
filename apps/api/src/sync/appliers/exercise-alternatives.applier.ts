import type { SyncRequest } from '@academia/contracts';

import { lwwUpdate } from '../lww';
import type { ApplyCtx } from './types';

export async function applyExerciseAlternatives(
  ctx: ApplyCtx,
  rows: NonNullable<SyncRequest['changes']['exerciseAlternatives']>,
) {
  const { tx, userId, now } = ctx;
  // Ownership é estrutural: a PK composta inclui userId, então uma linha de
  // outro usuário é inalcançável — não há checagem de IDOR a fazer.
  const existing = rows.length === 0 ? [] : await tx.exerciseAlternative.findMany({
    where: {
      userId,
      OR: rows.map((r) => ({ exercicioId: r.exercicioId, alternativaId: r.alternativaId })),
    },
    select: { exercicioId: true, alternativaId: true, updatedAt: true, deletedAt: true },
  });
  const existingMap = new Map<string, { updatedAt: string | null; deletedAt: string | null }>(
    existing.map((r: any) => [`${r.exercicioId}|${r.alternativaId}`, r]),
  );

  for (const row of rows) {
    const winner = lwwUpdate(row, existingMap.get(`${row.exercicioId}|${row.alternativaId}`));
    await tx.exerciseAlternative.upsert({
      where: {
        userId_exercicioId_alternativaId: {
          userId, exercicioId: row.exercicioId, alternativaId: row.alternativaId,
        },
      },
      create: {
        userId, exercicioId: row.exercicioId, alternativaId: row.alternativaId,
        updatedAt: winner.updatedAt, deletedAt: winner.deletedAt,
        dirty: false, serverUpdatedAt: now,
      },
      update: {
        updatedAt: winner.updatedAt, deletedAt: winner.deletedAt,
        dirty: false, serverUpdatedAt: now,
      },
    });
  }
}

export const mapExerciseAlternative = (r: any) => ({
  exercicioId: r.exercicioId, alternativaId: r.alternativaId,
  updatedAt: r.updatedAt ?? null, deletedAt: r.deletedAt,
});
