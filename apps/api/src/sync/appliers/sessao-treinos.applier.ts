import type { SyncRequest } from '@academia/contracts';

import { lwwUpdate, skip } from '../lww';
import type { ApplyCtx } from './types';

export async function applySessaoTreinos(
  ctx: ApplyCtx,
  rows: SyncRequest['changes']['sessaoTreinos'],
) {
  const { tx, userId, now, log } = ctx;
  // Fetch only rows owned by this user
  const existing = rows.length === 0 ? [] : await tx.sessaoTreino.findMany({
    where: { id: { in: rows.map((r) => r.id) }, userId },
    select: { id: true, updatedAt: true, deletedAt: true },
  });
  const existingMap = new Map<string, { updatedAt: string | null; deletedAt: string | null }>(
    existing.map((r: any) => [r.id, r]),
  );

  // Skip incoming ids that belong to a different user
  const allInDb = rows.length === 0 ? [] : await tx.sessaoTreino.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    select: { id: true },
  });
  const ownedIds = new Set(existing.map((r: any) => r.id));
  const rejected = new Set<string>(
    allInDb.map((r: any) => r.id).filter((id: string) => !ownedIds.has(id)),
  );
  skip(log, 'sessaoTreino', userId, rejected);

  for (const row of rows) {
    if (rejected.has(row.id)) continue;
    const winner = lwwUpdate(row, existingMap.get(row.id));
    await tx.sessaoTreino.upsert({
      where: { id: row.id },
      create: {
        id: winner.id, treinoId: winner.treinoId,
        treinoNomeSnapshot: winner.treinoNomeSnapshot,
        dataHoraInicio: winner.dataHoraInicio, dataHoraFim: winner.dataHoraFim,
        status: winner.status, arquivado: winner.arquivado,
        createdAt: winner.createdAt, updatedAt: winner.updatedAt,
        deletedAt: winner.deletedAt, dirty: false, serverUpdatedAt: now,
        userId,
      },
      update: {
        treinoNomeSnapshot: winner.treinoNomeSnapshot,
        dataHoraFim: winner.dataHoraFim, status: winner.status,
        arquivado: winner.arquivado, updatedAt: winner.updatedAt,
        deletedAt: winner.deletedAt, dirty: false, serverUpdatedAt: now,
      },
    });
  }
}

export const mapSessaoTreino = (r: any) => ({
  id: r.id, treinoId: r.treinoId, treinoNomeSnapshot: r.treinoNomeSnapshot,
  dataHoraInicio: r.dataHoraInicio, dataHoraFim: r.dataHoraFim,
  status: r.status, arquivado: r.arquivado,
  createdAt: r.createdAt, updatedAt: r.updatedAt, deletedAt: r.deletedAt,
});
