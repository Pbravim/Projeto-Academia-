import type { SyncChanges,SyncRequest, SyncResponse } from '@academia/contracts';
import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { applyExerciseAlternatives, mapExerciseAlternative } from './appliers/exercise-alternatives.applier';
import { applyExercises, mapExercise } from './appliers/exercises.applier';
import { applyRegistrosPeso, mapRegistroPeso } from './appliers/registros-peso.applier';
import { applySerieSegmentos, mapSerieSegmento } from './appliers/serie-segmentos.applier';
import { applySeriesRegistradas, mapSerieRegistrada } from './appliers/series-registradas.applier';
import { applySessaoExercicios, mapSessaoExercicio } from './appliers/sessao-exercicios.applier';
import { applySessaoTreinos, mapSessaoTreino } from './appliers/sessao-treinos.applier';
import { applyTreinoExercicios, mapTreinoExercicio } from './appliers/treino-exercicios.applier';
import { applyTreinos, mapTreino } from './appliers/treinos.applier';
import { applyUserSettings, mapUserSetting } from './appliers/user-settings.applier';

// A concurrent transaction on another device stamps rows with a `now` computed before
// its commit; if it commits after our pull read, those rows carry serverUpdatedAt < our
// cursor and would be skipped forever. Keeping the cursor this far in the past re-covers
// that window (Prisma interactive tx timeout 5s + clock skew); re-delivered rows are
// harmless because the client apply is idempotent LWW.
const CURSOR_SAFETY_MARGIN_MS = 10_000;

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sync(userId: string, req: SyncRequest): Promise<SyncResponse> {
    const sinceDate = req.since ? new Date(req.since) : null;
    const now = new Date();
    this.clampClientClocks(req.changes, now.toISOString());

    const serverChanges = await this.prisma.$transaction(async (tx) => {
      const ctx = { tx, userId, now, log: this.logger };
      await applyExercises(ctx, req.changes.exercises);
      await applyTreinos(ctx, req.changes.treinos);
      await applyTreinoExercicios(ctx, req.changes.treinoExercicios);
      await applySessaoTreinos(ctx, req.changes.sessaoTreinos);
      await applySessaoExercicios(ctx, req.changes.sessaoExercicios);
      await applySeriesRegistradas(ctx, req.changes.seriesRegistradas);
      // `?? []`: clientes anteriores ao campo serieSegmentos não o enviam.
      await applySerieSegmentos(ctx, req.changes.serieSegmentos ?? []);
      await applyRegistrosPeso(ctx, req.changes.registrosPeso);
      await applyUserSettings(ctx, req.changes.userSettings);
      // `?? []`: clientes anteriores ao campo exerciseAlternatives não o enviam.
      await applyExerciseAlternatives(ctx, req.changes.exerciseAlternatives ?? []);

      return this.pullChanges(tx, userId, sinceDate);
    });

    const safeCursor = new Date(Math.max(
      sinceDate?.getTime() ?? 0,
      Date.now() - CURSOR_SAFETY_MARGIN_MS,
    ));
    return { serverChanges, newCursor: safeCursor.toISOString() };
  }

  // O LWW compara timestamps gerados pelo RELÓGIO DO CLIENTE: um device 2h
  // adiantado venceria qualquer edição legítima das próximas 2h em todos os
  // outros devices. Clampar ao relógio do servidor limita o dano do skew.
  private clampClientClocks(changes: SyncChanges, nowIso: string) {
    const clamp = (r: { updatedAt: string | null; deletedAt: string | null }) => {
      if (r.updatedAt && r.updatedAt > nowIso) r.updatedAt = nowIso;
      if (r.deletedAt && r.deletedAt > nowIso) r.deletedAt = nowIso;
    };
    changes.exercises.forEach(clamp);
    changes.treinos.forEach(clamp);
    changes.treinoExercicios.forEach(clamp);
    changes.sessaoTreinos.forEach(clamp);
    changes.sessaoExercicios.forEach(clamp);
    changes.seriesRegistradas.forEach(clamp);
    changes.serieSegmentos?.forEach(clamp); // ausente em clientes antigos
    changes.registrosPeso.forEach(clamp);
    changes.userSettings.forEach(clamp);
    changes.exerciseAlternatives?.forEach(clamp); // ausente em clientes antigos
  }

  private async pullChanges(tx: any, userId: string, since: Date | null): Promise<SyncChanges> {
    const cursor = since ? { gt: since } : undefined;
    const where = (extra = {}) => ({ ...extra, serverUpdatedAt: cursor });

    const [exercises, treinos, treinoExercicios, sessaoTreinos,
           sessaoExercicios, seriesRegistradas, serieSegmentos, registrosPeso, userSettings,
           exerciseAlternatives] = await Promise.all([
      tx.exercise.findMany({ where: where({ OR: [{ userId }, { isCustom: false }] }) }),
      tx.treino.findMany({ where: where({ userId }) }),
      tx.treinoExercicio.findMany({
        where: { serverUpdatedAt: cursor, treino: { userId } },
      }),
      tx.sessaoTreino.findMany({ where: where({ userId }) }),
      tx.sessaoExercicio.findMany({
        where: { serverUpdatedAt: cursor, sessaoTreino: { userId } },
      }),
      tx.serieRegistrada.findMany({
        where: { serverUpdatedAt: cursor, sessaoExercicio: { sessaoTreino: { userId } } },
      }),
      tx.serieSegmento.findMany({
        where: { serverUpdatedAt: cursor, serie: { sessaoExercicio: { sessaoTreino: { userId } } } },
      }),
      tx.registroPeso.findMany({ where: where({ userId }) }),
      tx.userSetting.findMany({ where: where({ userId }) }),
      tx.exerciseAlternative.findMany({ where: where({ userId }) }),
    ]);

    return {
      exercises: exercises.map(mapExercise),
      treinos: treinos.map(mapTreino),
      treinoExercicios: treinoExercicios.map(mapTreinoExercicio),
      sessaoTreinos: sessaoTreinos.map(mapSessaoTreino),
      sessaoExercicios: sessaoExercicios.map(mapSessaoExercicio),
      seriesRegistradas: seriesRegistradas.map(mapSerieRegistrada),
      serieSegmentos: serieSegmentos.map(mapSerieSegmento),
      registrosPeso: registrosPeso.map(mapRegistroPeso),
      userSettings: userSettings.map(mapUserSetting),
      exerciseAlternatives: exerciseAlternatives.map(mapExerciseAlternative),
    };
  }
}
