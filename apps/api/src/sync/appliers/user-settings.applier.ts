import type { SyncRequest } from '@academia/contracts';

import { lwwTime } from '../lww';
import type { ApplyCtx } from './types';

export async function applyUserSettings(
  ctx: ApplyCtx,
  rows: SyncRequest['changes']['userSettings'],
) {
  const { tx, userId, now } = ctx;
  const existing = rows.length === 0 ? [] : await tx.userSetting.findMany({
    where: { userId, key: { in: rows.map((r) => r.key) } },
    select: { key: true, value: true, updatedAt: true, deletedAt: true },
  });
  const existingMap = new Map<string, { updatedAt: string | null; deletedAt: string | null }>(
    existing.map((r: any) => [r.key, r]),
  );
  for (const row of rows) {
    const existingRow = existingMap.get(row.key);
    const winner =
      !existingRow || lwwTime(row) >= lwwTime(existingRow)
        ? row
        : (existingRow as typeof row);
    await tx.userSetting.upsert({
      where: { userId_key: { userId, key: row.key } },
      create: {
        userId, key: row.key, value: winner.value,
        updatedAt: winner.updatedAt, deletedAt: winner.deletedAt,
        dirty: false, serverUpdatedAt: now,
      },
      update: {
        value: winner.value, updatedAt: winner.updatedAt,
        deletedAt: winner.deletedAt, dirty: false, serverUpdatedAt: now,
      },
    });
  }
}

export const mapUserSetting = (r: any) => ({
  key: r.key, value: r.value, updatedAt: r.updatedAt ?? null, deletedAt: r.deletedAt,
});
