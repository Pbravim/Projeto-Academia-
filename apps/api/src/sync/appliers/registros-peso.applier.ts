import type { SyncRequest } from '@academia/contracts';

import { lwwUpdate, skip } from '../lww';

import type { ApplyCtx } from './types';

export async function applyRegistrosPeso(
  ctx: ApplyCtx,
  rows: SyncRequest['changes']['registrosPeso'],
) {
  const { tx, userId, now, log } = ctx;
  // Fetch only rows owned by this user
  const existing = rows.length === 0 ? [] : await tx.registroPeso.findMany({
    where: { id: { in: rows.map((r) => r.id) }, userId },
    select: { id: true, updatedAt: true, deletedAt: true },
  });
  const existingMap = new Map<string, { updatedAt: string | null; deletedAt: string | null }>(
    existing.map((r: any) => [r.id, r]),
  );

  // Skip incoming ids that belong to a different user
  const allInDb = rows.length === 0 ? [] : await tx.registroPeso.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    select: { id: true },
  });
  const ownedIds = new Set(existing.map((r: any) => r.id));
  const rejected = new Set<string>(
    allInDb.map((r: any) => r.id).filter((id: string) => !ownedIds.has(id)),
  );
  skip(log, 'registroPeso', userId, rejected);

  for (const row of rows) {
    if (rejected.has(row.id)) continue;
    const winner = lwwUpdate(row, existingMap.get(row.id));
    await tx.registroPeso.upsert({
      where: { id: row.id },
      create: {
        id: winner.id, pesoKg: winner.pesoKg, dataRegistro: winner.dataRegistro,
        observacao: winner.observacao, createdAt: winner.createdAt,
        updatedAt: winner.updatedAt, deletedAt: winner.deletedAt,
        dirty: false, serverUpdatedAt: now, userId,
      },
      update: {
        pesoKg: winner.pesoKg, dataRegistro: winner.dataRegistro,
        observacao: winner.observacao, updatedAt: winner.updatedAt,
        deletedAt: winner.deletedAt, dirty: false, serverUpdatedAt: now,
      },
    });
  }
}

export const mapRegistroPeso = (r: any) => ({
  id: r.id, pesoKg: r.pesoKg, dataRegistro: r.dataRegistro,
  observacao: r.observacao, createdAt: r.createdAt,
  updatedAt: r.updatedAt, deletedAt: r.deletedAt,
});
