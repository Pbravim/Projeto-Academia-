import type { Logger } from '@nestjs/common';

// Uma linha rejeitada (id colidindo com linha de outro usuário, pai não
// possuído) é PULADA com log em vez de abortar a transação: um throw aqui
// envenenava a conta — o dirty nunca limpava no mobile e todo sync futuro
// falhava com o mesmo erro, sem remédio na UI.
export function skip(logger: Logger, table: string, userId: string, ids: Iterable<string>) {
  const list = [...ids];
  if (list.length === 0) return;
  logger.warn(
    `sync: skipping ${list.length} ${table} row(s) not owned by user ${userId}: ${list.join(', ')}`,
  );
}

export function lwwUpdate<T extends { updatedAt: string | null; deletedAt: string | null }>(
  incoming: T,
  existing: { updatedAt: string | null; deletedAt: string | null } | undefined,
): T {
  if (!existing) return incoming;
  return lwwTime(incoming) >= lwwTime(existing) ? incoming : (existing as T);
}

// Effective LWW timestamp: deletes carry their time in deletedAt (updatedAt may lag),
// so the row's logical clock is the max of the two. ISO-8601 compares lexicographically.
export function lwwTime(row: { updatedAt: string | null; deletedAt: string | null }): string {
  const updated = row.updatedAt ?? '';
  const deleted = row.deletedAt ?? '';
  return updated >= deleted ? updated : deleted;
}
