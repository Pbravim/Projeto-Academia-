import type { SyncRequest } from '@academia/contracts';

import { lwwUpdate, skip } from '../lww';
import type { ApplyCtx } from './types';

export async function applyTreinoExercicios(
  ctx: ApplyCtx,
  rows: SyncRequest['changes']['treinoExercicios'],
) {
  const { tx, userId, now, log } = ctx;
  // Validate parent ownership
  const treinoIds = [...new Set(rows.map((r) => r.treinoId))];
  const ownedTreinos = treinoIds.length === 0 ? [] : await tx.treino.findMany({
    where: { id: { in: treinoIds }, userId },
    select: { id: true },
  });
  const ownedTreinoIds = new Set(ownedTreinos.map((t: any) => t.id));
  const rejected = new Set<string>();
  for (const row of rows) {
    if (!ownedTreinoIds.has(row.treinoId)) rejected.add(row.id);
  }

  // Rows whose existing DB record sits under a treino of another user are also skipped
  const existingRows = rows.length === 0 ? [] : await tx.treinoExercicio.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    select: { id: true, treinoId: true },
  });
  for (const existing of existingRows) {
    if (!ownedTreinoIds.has(existing.treinoId)) rejected.add(existing.id);
  }
  skip(log, 'treinoExercicio', userId, rejected);

  const existing = rows.length === 0 ? [] : await tx.treinoExercicio.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    select: { id: true, updatedAt: true, deletedAt: true },
  });
  const existingMap = new Map<string, { updatedAt: string | null; deletedAt: string | null }>(
    existing.map((r: any) => [r.id, r]),
  );
  for (const row of rows) {
    if (rejected.has(row.id)) continue;
    const winner = lwwUpdate(row, existingMap.get(row.id));
    await tx.treinoExercicio.upsert({
      where: { id: row.id },
      create: {
        id: winner.id, treinoId: winner.treinoId, exercicioId: winner.exercicioId,
        ordem: winner.ordem, seriesRecomendadas: winner.seriesRecomendadas,
        execucoesRecomendadas: winner.execucoesRecomendadas, cargaPadrao: winner.cargaPadrao,
        tempoDescansoSegundos: winner.tempoDescansoSegundos, metodo: winner.metodo,
        grupoId: winner.grupoId,
        duracaoRecomendadaSegundos: winner.duracaoRecomendadaSegundos,
        distanciaRecomendadaMetros: winner.distanciaRecomendadaMetros,
        intensidadeRecomendada: winner.intensidadeRecomendada,
        updatedAt: winner.updatedAt,
        deletedAt: winner.deletedAt, dirty: false, serverUpdatedAt: now,
      },
      update: {
        ordem: winner.ordem, seriesRecomendadas: winner.seriesRecomendadas,
        execucoesRecomendadas: winner.execucoesRecomendadas, cargaPadrao: winner.cargaPadrao,
        tempoDescansoSegundos: winner.tempoDescansoSegundos, metodo: winner.metodo,
        grupoId: winner.grupoId,
        duracaoRecomendadaSegundos: winner.duracaoRecomendadaSegundos,
        distanciaRecomendadaMetros: winner.distanciaRecomendadaMetros,
        intensidadeRecomendada: winner.intensidadeRecomendada,
        updatedAt: winner.updatedAt,
        deletedAt: winner.deletedAt, dirty: false, serverUpdatedAt: now,
      },
    });
  }
}

export const mapTreinoExercicio = (r: any) => ({
  id: r.id, treinoId: r.treinoId, exercicioId: r.exercicioId, ordem: r.ordem,
  seriesRecomendadas: r.seriesRecomendadas, execucoesRecomendadas: r.execucoesRecomendadas,
  cargaPadrao: r.cargaPadrao, tempoDescansoSegundos: r.tempoDescansoSegundos,
  metodo: r.metodo, grupoId: r.grupoId,
  duracaoRecomendadaSegundos: r.duracaoRecomendadaSegundos,
  distanciaRecomendadaMetros: r.distanciaRecomendadaMetros,
  intensidadeRecomendada: r.intensidadeRecomendada,
  updatedAt: r.updatedAt ?? '', deletedAt: r.deletedAt,
});
