import type { SyncRequest } from '@academia/contracts';

import { lwwUpdate, skip } from '../lww';
import type { ApplyCtx } from './types';

export async function applySessaoExercicios(
  ctx: ApplyCtx,
  rows: SyncRequest['changes']['sessaoExercicios'],
) {
  const { tx, userId, now, log } = ctx;
  // Validate parent ownership
  const sessaoTreinoIds = [...new Set(rows.map((r) => r.sessaoTreinoId))];
  const ownedSessoes = sessaoTreinoIds.length === 0 ? [] : await tx.sessaoTreino.findMany({
    where: { id: { in: sessaoTreinoIds }, userId },
    select: { id: true },
  });
  const ownedSessaoIds = new Set(ownedSessoes.map((s: any) => s.id));
  const rejected = new Set<string>();
  for (const row of rows) {
    if (!ownedSessaoIds.has(row.sessaoTreinoId)) rejected.add(row.id);
  }

  // Rows whose existing DB record sits under another user's sessaoTreino are also skipped
  const existingRowsCheck = rows.length === 0 ? [] : await tx.sessaoExercicio.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    select: { id: true, sessaoTreinoId: true },
  });
  for (const existing of existingRowsCheck) {
    if (!ownedSessaoIds.has(existing.sessaoTreinoId)) rejected.add(existing.id);
  }
  skip(log, 'sessaoExercicio', userId, rejected);

  const existing = rows.length === 0 ? [] : await tx.sessaoExercicio.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    select: { id: true, updatedAt: true, deletedAt: true },
  });
  const existingMap = new Map<string, { updatedAt: string | null; deletedAt: string | null }>(
    existing.map((r: any) => [r.id, r]),
  );
  for (const row of rows) {
    if (rejected.has(row.id)) continue;
    const winner = lwwUpdate(row, existingMap.get(row.id));
    await tx.sessaoExercicio.upsert({
      where: { id: row.id },
      create: {
        id: winner.id, sessaoTreinoId: winner.sessaoTreinoId,
        exercicioId: winner.exercicioId, ordem: winner.ordem,
        nomeSnapshot: winner.nomeSnapshot, grupoMuscularSnapshot: winner.grupoMuscularSnapshot,
        categoriaSnapshot: winner.categoriaSnapshot, equipamentoSnapshot: winner.equipamentoSnapshot,
        musculoAlvoSnapshot: winner.musculoAlvoSnapshot, nomeOriginalSnapshot: winner.nomeOriginalSnapshot,
        movementPatternSnapshot: winner.movementPatternSnapshot,
        realizado: winner.realizado, seriesRecomendadas: winner.seriesRecomendadas,
        execucoesRecomendadas: winner.execucoesRecomendadas, cargaPadrao: winner.cargaPadrao,
        tempoDescansoSegundos: winner.tempoDescansoSegundos, metodo: winner.metodo,
        grupoId: winner.grupoId, substituidoPorExercicioId: winner.substituidoPorExercicioId,
        substituicaoMotivo: winner.substituicaoMotivo,
        trackingTypeSnapshot: winner.trackingTypeSnapshot,
        duracaoRecomendadaSegundos: winner.duracaoRecomendadaSegundos,
        distanciaRecomendadaMetros: winner.distanciaRecomendadaMetros,
        intensidadeRecomendada: winner.intensidadeRecomendada,
        createdAt: winner.createdAt, updatedAt: winner.updatedAt,
        deletedAt: winner.deletedAt, dirty: false, serverUpdatedAt: now,
      },
      update: {
        nomeSnapshot: winner.nomeSnapshot, realizado: winner.realizado,
        movementPatternSnapshot: winner.movementPatternSnapshot,
        seriesRecomendadas: winner.seriesRecomendadas, execucoesRecomendadas: winner.execucoesRecomendadas,
        cargaPadrao: winner.cargaPadrao, tempoDescansoSegundos: winner.tempoDescansoSegundos,
        metodo: winner.metodo, grupoId: winner.grupoId,
        substituidoPorExercicioId: winner.substituidoPorExercicioId,
        substituicaoMotivo: winner.substituicaoMotivo,
        trackingTypeSnapshot: winner.trackingTypeSnapshot,
        duracaoRecomendadaSegundos: winner.duracaoRecomendadaSegundos,
        distanciaRecomendadaMetros: winner.distanciaRecomendadaMetros,
        intensidadeRecomendada: winner.intensidadeRecomendada,
        updatedAt: winner.updatedAt, deletedAt: winner.deletedAt,
        dirty: false, serverUpdatedAt: now,
      },
    });
  }
}

export const mapSessaoExercicio = (r: any) => ({
  id: r.id, sessaoTreinoId: r.sessaoTreinoId, exercicioId: r.exercicioId,
  ordem: r.ordem, nomeSnapshot: r.nomeSnapshot,
  grupoMuscularSnapshot: r.grupoMuscularSnapshot, categoriaSnapshot: r.categoriaSnapshot,
  equipamentoSnapshot: r.equipamentoSnapshot, musculoAlvoSnapshot: r.musculoAlvoSnapshot,
  nomeOriginalSnapshot: r.nomeOriginalSnapshot,
  movementPatternSnapshot: r.movementPatternSnapshot ?? null,
  realizado: r.realizado,
  seriesRecomendadas: r.seriesRecomendadas, execucoesRecomendadas: r.execucoesRecomendadas,
  cargaPadrao: r.cargaPadrao, tempoDescansoSegundos: r.tempoDescansoSegundos,
  metodo: r.metodo, grupoId: r.grupoId,
  substituidoPorExercicioId: r.substituidoPorExercicioId, substituicaoMotivo: r.substituicaoMotivo,
  trackingTypeSnapshot: r.trackingTypeSnapshot,
  duracaoRecomendadaSegundos: r.duracaoRecomendadaSegundos,
  distanciaRecomendadaMetros: r.distanciaRecomendadaMetros,
  intensidadeRecomendada: r.intensidadeRecomendada,
  createdAt: r.createdAt, updatedAt: r.updatedAt, deletedAt: r.deletedAt,
});
