import type { SyncRequest } from '@academia/contracts';

import { lwwUpdate, skip } from '../lww';

import type { ApplyCtx } from './types';

export async function applySeriesRegistradas(
  ctx: ApplyCtx,
  rows: SyncRequest['changes']['seriesRegistradas'],
) {
  const { tx, userId, now, log } = ctx;
  // Validate grandparent ownership via sessaoExercicio -> sessaoTreino
  const sessaoExercicioIds = [...new Set(rows.map((r) => r.sessaoExercicioId))];
  const ownedSessaoExercicios = sessaoExercicioIds.length === 0 ? [] : await tx.sessaoExercicio.findMany({
    where: { id: { in: sessaoExercicioIds }, sessaoTreino: { userId } },
    select: { id: true },
  });
  const ownedSessaoExercicioIds = new Set(ownedSessaoExercicios.map((s: any) => s.id));
  const rejected = new Set<string>();
  for (const row of rows) {
    if (!ownedSessaoExercicioIds.has(row.sessaoExercicioId)) rejected.add(row.id);
  }

  // Rows whose existing DB record sits under another user's sessaoExercicio are also skipped
  const existingRowsCheck = rows.length === 0 ? [] : await tx.serieRegistrada.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    select: { id: true, sessaoExercicioId: true },
  });
  for (const existing of existingRowsCheck) {
    if (!ownedSessaoExercicioIds.has(existing.sessaoExercicioId)) rejected.add(existing.id);
  }
  skip(log, 'serieRegistrada', userId, rejected);

  const existing = rows.length === 0 ? [] : await tx.serieRegistrada.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    select: { id: true, updatedAt: true, deletedAt: true },
  });
  const existingMap = new Map<string, { updatedAt: string | null; deletedAt: string | null }>(
    existing.map((r: any) => [r.id, r]),
  );
  for (const row of rows) {
    if (rejected.has(row.id)) continue;
    const winner = lwwUpdate(row, existingMap.get(row.id));
    await tx.serieRegistrada.upsert({
      where: { id: row.id },
      create: {
        id: winner.id, sessaoExercicioId: winner.sessaoExercicioId,
        tipoSerie: winner.tipoSerie, ordem: winner.ordem,
        cargaKg: winner.cargaKg, repeticoes: winner.repeticoes,
        duracaoSegundos: winner.duracaoSegundos, distanciaMetros: winner.distanciaMetros,
        intensidade: winner.intensidade,
        observacao: winner.observacao, createdAt: winner.createdAt,
        updatedAt: winner.updatedAt, deletedAt: winner.deletedAt,
        dirty: false, serverUpdatedAt: now,
      },
      update: {
        tipoSerie: winner.tipoSerie, ordem: winner.ordem,
        cargaKg: winner.cargaKg, repeticoes: winner.repeticoes,
        duracaoSegundos: winner.duracaoSegundos, distanciaMetros: winner.distanciaMetros,
        intensidade: winner.intensidade,
        observacao: winner.observacao, updatedAt: winner.updatedAt,
        deletedAt: winner.deletedAt, dirty: false, serverUpdatedAt: now,
      },
    });
  }
}

export const mapSerieRegistrada = (r: any) => ({
  id: r.id, sessaoExercicioId: r.sessaoExercicioId, tipoSerie: r.tipoSerie,
  ordem: r.ordem, cargaKg: r.cargaKg, repeticoes: r.repeticoes,
  duracaoSegundos: r.duracaoSegundos, distanciaMetros: r.distanciaMetros,
  intensidade: r.intensidade,
  observacao: r.observacao, createdAt: r.createdAt,
  updatedAt: r.updatedAt, deletedAt: r.deletedAt,
});
