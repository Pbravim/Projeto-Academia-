import type { SyncRequest } from '@academia/contracts';

import { lwwUpdate, skip } from '../lww';
import type { ApplyCtx } from './types';

export async function applyExercises(
  ctx: ApplyCtx,
  rows: SyncRequest['changes']['exercises'],
) {
  const { tx, userId, now, log } = ctx;
  // Only custom exercises are user-owned; silently drop any row where isCustom is false
  // (client cannot create or modify global catalogue exercises).
  const customRows = rows.filter((r) => r.isCustom);
  const customIds = customRows.map((r) => r.id);

  const existing = customRows.length === 0 ? [] : await tx.exercise.findMany({
    where: { id: { in: customIds }, userId },
    select: { id: true, updatedAt: true, deletedAt: true },
  });
  const existingMap = new Map<string, { updatedAt: string | null; deletedAt: string | null }>(
    existing.map((r: any) => [r.id, r]),
  );

  // Check if any custom row id exists in DB with a different owner (IDOR guard).
  // Also block writes to global catalogue entries (userId == null).
  const allCustomInDb = customRows.length === 0 ? [] : await tx.exercise.findMany({
    where: { id: { in: customIds } },
    select: { id: true, userId: true },
  });
  const globalCatalogueIds = new Set(
    allCustomInDb.filter((r: any) => r.userId === null).map((r: any) => r.id),
  );
  const allCustomInDbIds = new Set<string>(allCustomInDb.map((r: any) => r.id as string));
  const ownedCustomIds = new Set(existing.map((r: any) => r.id));
  const rejected = new Set<string>(
    [...allCustomInDbIds].filter((id) => !ownedCustomIds.has(id)),
  );
  skip(log, 'exercise', userId, rejected);

  for (const row of customRows) {
    if (rejected.has(row.id)) continue;
    // Skip any row that resolves to a global catalogue entry (extra safety net)
    if (globalCatalogueIds.has(row.id)) continue;

    const winner = lwwUpdate(row, existingMap.get(row.id));
    await tx.exercise.upsert({
      where: { id: row.id },
      create: {
        id: winner.id, name: winner.name, normalizedName: winner.normalizedName,
        groupMuscle: winner.groupMuscle, category: winner.category,
        equipment: winner.equipment, loadUnit: winner.loadUnit,
        // Always force isCustom: true on create — never trust the client value
        isCustom: true, mediaOnline: winner.mediaOnline,
        mediaLocal: winner.mediaLocal, musculoAlvo: winner.musculoAlvo,
        movementPattern: winner.movementPattern, stabilizers: winner.stabilizers,
        executionType: winner.executionType, nameVariations: winner.nameVariations,
        primaryEquipment: winner.primaryEquipment, secondaryEquipment: winner.secondaryEquipment,
        catalogVersion: winner.catalogVersion, trackingType: winner.trackingType,
        createdAt: winner.createdAt, updatedAt: winner.updatedAt,
        deletedAt: winner.deletedAt, dirty: false, serverUpdatedAt: now,
        userId,
      },
      update: {
        name: winner.name, normalizedName: winner.normalizedName,
        groupMuscle: winner.groupMuscle, category: winner.category,
        equipment: winner.equipment, loadUnit: winner.loadUnit,
        // isCustom is intentionally omitted from updates — it must never change
        mediaOnline: winner.mediaOnline,
        mediaLocal: winner.mediaLocal, musculoAlvo: winner.musculoAlvo,
        movementPattern: winner.movementPattern, stabilizers: winner.stabilizers,
        executionType: winner.executionType, nameVariations: winner.nameVariations,
        primaryEquipment: winner.primaryEquipment, secondaryEquipment: winner.secondaryEquipment,
        catalogVersion: winner.catalogVersion, trackingType: winner.trackingType,
        updatedAt: winner.updatedAt, deletedAt: winner.deletedAt,
        dirty: false, serverUpdatedAt: now,
      },
    });
  }
}

export const mapExercise = (r: any) => ({
  id: r.id, name: r.name, normalizedName: r.normalizedName,
  groupMuscle: r.groupMuscle, category: r.category, equipment: r.equipment,
  loadUnit: r.loadUnit, isCustom: r.isCustom, mediaOnline: r.mediaOnline,
  mediaLocal: r.mediaLocal, musculoAlvo: r.musculoAlvo,
  movementPattern: r.movementPattern, stabilizers: r.stabilizers,
  executionType: r.executionType, nameVariations: r.nameVariations,
  primaryEquipment: r.primaryEquipment, secondaryEquipment: r.secondaryEquipment,
  catalogVersion: r.catalogVersion, trackingType: r.trackingType,
  createdAt: r.createdAt, updatedAt: r.updatedAt, deletedAt: r.deletedAt,
});
