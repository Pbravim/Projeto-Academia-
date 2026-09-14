import type { SyncRequest } from '@academia/contracts';

import { lwwUpdate, skip } from '../lww';

import type { ApplyCtx } from './types';

export async function applySerieSegmentos(
  ctx: ApplyCtx,
  rows: NonNullable<SyncRequest['changes']['serieSegmentos']>,
) {
  const { tx, userId, now, log } = ctx;
  // Validate great-grandparent ownership via serieRegistrada -> sessaoExercicio -> sessaoTreino
  const serieIds = [...new Set(rows.map((r) => r.serieId))];
  const ownedSeries = serieIds.length === 0 ? [] : await tx.serieRegistrada.findMany({
    where: { id: { in: serieIds }, sessaoExercicio: { sessaoTreino: { userId } } },
    select: { id: true },
  });
  const ownedSerieIds = new Set(ownedSeries.map((s: any) => s.id));
  const rejected = new Set<string>();
  for (const row of rows) {
    if (!ownedSerieIds.has(row.serieId)) rejected.add(row.id);
  }

  // Rows whose existing DB record sits under another user's série are also skipped
  const existingRowsCheck = rows.length === 0 ? [] : await tx.serieSegmento.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    select: { id: true, serieId: true },
  });
  for (const existing of existingRowsCheck) {
    if (!ownedSerieIds.has(existing.serieId)) rejected.add(existing.id);
  }
  skip(log, 'serieSegmento', userId, rejected);

  const existing = rows.length === 0 ? [] : await tx.serieSegmento.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    select: { id: true, updatedAt: true, deletedAt: true },
  });
  const existingMap = new Map<string, { updatedAt: string | null; deletedAt: string | null }>(
    existing.map((r: any) => [r.id, r]),
  );
  for (const row of rows) {
    if (rejected.has(row.id)) continue;
    const winner = lwwUpdate(row, existingMap.get(row.id));
    await tx.serieSegmento.upsert({
      where: { id: row.id },
      create: {
        id: winner.id, serieId: winner.serieId, ordem: winner.ordem,
        cargaKg: winner.cargaKg, repeticoes: winner.repeticoes,
        descansoSegundos: winner.descansoSegundos,
        createdAt: winner.createdAt, updatedAt: winner.updatedAt,
        deletedAt: winner.deletedAt, dirty: false, serverUpdatedAt: now,
      },
      update: {
        ordem: winner.ordem, cargaKg: winner.cargaKg, repeticoes: winner.repeticoes,
        descansoSegundos: winner.descansoSegundos,
        updatedAt: winner.updatedAt, deletedAt: winner.deletedAt,
        dirty: false, serverUpdatedAt: now,
      },
    });
  }
}

export const mapSerieSegmento = (r: any) => ({
  id: r.id, serieId: r.serieId, ordem: r.ordem,
  cargaKg: r.cargaKg, repeticoes: r.repeticoes, descansoSegundos: r.descansoSegundos,
  createdAt: r.createdAt, updatedAt: r.updatedAt, deletedAt: r.deletedAt,
});
