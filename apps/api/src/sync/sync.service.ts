import type { SyncChanges,SyncRequest, SyncResponse } from '@academia/contracts';
import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

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

  // Uma linha rejeitada (id colidindo com linha de outro usuário, pai não
  // possuído) é PULADA com log em vez de abortar a transação: um throw aqui
  // envenenava a conta — o dirty nunca limpava no mobile e todo sync futuro
  // falhava com o mesmo erro, sem remédio na UI.
  private skip(table: string, userId: string, ids: Iterable<string>) {
    const list = [...ids];
    if (list.length === 0) return;
    this.logger.warn(
      `sync: skipping ${list.length} ${table} row(s) not owned by user ${userId}: ${list.join(', ')}`,
    );
  }

  async sync(userId: string, req: SyncRequest): Promise<SyncResponse> {
    const sinceDate = req.since ? new Date(req.since) : null;
    const now = new Date();
    this.clampClientClocks(req.changes, now.toISOString());

    const serverChanges = await this.prisma.$transaction(async (tx) => {
      await this.applyExercises(tx, userId, req.changes.exercises, now);
      await this.applyTreinos(tx, userId, req.changes.treinos, now);
      await this.applyTreinoExercicios(tx, userId, req.changes.treinoExercicios, now);
      await this.applySessaoTreinos(tx, userId, req.changes.sessaoTreinos, now);
      await this.applySessaoExercicios(tx, userId, req.changes.sessaoExercicios, now);
      await this.applySeriesRegistradas(tx, userId, req.changes.seriesRegistradas, now);
      await this.applyRegistrosPeso(tx, userId, req.changes.registrosPeso, now);
      await this.applyUserSettings(tx, userId, req.changes.userSettings, now);
      // `?? []`: clientes anteriores ao campo exerciseAlternatives não o enviam.
      await this.applyExerciseAlternatives(tx, userId, req.changes.exerciseAlternatives ?? [], now);

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
    changes.registrosPeso.forEach(clamp);
    changes.userSettings.forEach(clamp);
    changes.exerciseAlternatives?.forEach(clamp); // ausente em clientes antigos
  }

  private lwwUpdate<T extends { updatedAt: string | null; deletedAt: string | null }>(
    incoming: T,
    existing: { updatedAt: string | null; deletedAt: string | null } | undefined,
  ): T {
    if (!existing) return incoming;
    return this.lwwTime(incoming) >= this.lwwTime(existing) ? incoming : (existing as T);
  }

  // Effective LWW timestamp: deletes carry their time in deletedAt (updatedAt may lag),
  // so the row's logical clock is the max of the two. ISO-8601 compares lexicographically.
  private lwwTime(row: { updatedAt: string | null; deletedAt: string | null }): string {
    const updated = row.updatedAt ?? '';
    const deleted = row.deletedAt ?? '';
    return updated >= deleted ? updated : deleted;
  }

  private async applyExercises(tx: any, userId: string, rows: SyncRequest['changes']['exercises'], now: Date) {
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
    this.skip('exercise', userId, rejected);

    for (const row of customRows) {
      if (rejected.has(row.id)) continue;
      // Skip any row that resolves to a global catalogue entry (extra safety net)
      if (globalCatalogueIds.has(row.id)) continue;

      const winner = this.lwwUpdate(row, existingMap.get(row.id));
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

  private async applyTreinos(tx: any, userId: string, rows: SyncRequest['changes']['treinos'], now: Date) {
    // Fetch only rows owned by this user
    const existing = rows.length === 0 ? [] : await tx.treino.findMany({
      where: { id: { in: rows.map((r) => r.id) }, userId },
      select: { id: true, updatedAt: true, deletedAt: true },
    });
    const existingMap = new Map<string, { updatedAt: string | null; deletedAt: string | null }>(
      existing.map((r: any) => [r.id, r]),
    );

    // Skip incoming ids that belong to a different user
    const allInDb = rows.length === 0 ? [] : await tx.treino.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
      select: { id: true },
    });
    const ownedIds = new Set(existing.map((r: any) => r.id));
    const rejected = new Set<string>(
      allInDb.map((r: any) => r.id).filter((id: string) => !ownedIds.has(id)),
    );
    this.skip('treino', userId, rejected);

    for (const row of rows) {
      if (rejected.has(row.id)) continue;
      const winner = this.lwwUpdate(row, existingMap.get(row.id));
      await tx.treino.upsert({
        where: { id: row.id },
        create: {
          id: winner.id, name: winner.name, objetivo: winner.objetivo,
          createdAt: winner.createdAt, updatedAt: winner.updatedAt,
          deletedAt: winner.deletedAt, dirty: false, serverUpdatedAt: now,
          userId,
        },
        update: {
          name: winner.name, objetivo: winner.objetivo,
          updatedAt: winner.updatedAt, deletedAt: winner.deletedAt,
          dirty: false, serverUpdatedAt: now,
        },
      });
    }
  }

  private async applyTreinoExercicios(tx: any, userId: string, rows: SyncRequest['changes']['treinoExercicios'], now: Date) {
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
    this.skip('treinoExercicio', userId, rejected);

    const existing = rows.length === 0 ? [] : await tx.treinoExercicio.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
      select: { id: true, updatedAt: true, deletedAt: true },
    });
    const existingMap = new Map<string, { updatedAt: string | null; deletedAt: string | null }>(
      existing.map((r: any) => [r.id, r]),
    );
    for (const row of rows) {
      if (rejected.has(row.id)) continue;
      const winner = this.lwwUpdate(row, existingMap.get(row.id));
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

  private async applySessaoTreinos(tx: any, userId: string, rows: SyncRequest['changes']['sessaoTreinos'], now: Date) {
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
    this.skip('sessaoTreino', userId, rejected);

    for (const row of rows) {
      if (rejected.has(row.id)) continue;
      const winner = this.lwwUpdate(row, existingMap.get(row.id));
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

  private async applySessaoExercicios(tx: any, userId: string, rows: SyncRequest['changes']['sessaoExercicios'], now: Date) {
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
    this.skip('sessaoExercicio', userId, rejected);

    const existing = rows.length === 0 ? [] : await tx.sessaoExercicio.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
      select: { id: true, updatedAt: true, deletedAt: true },
    });
    const existingMap = new Map<string, { updatedAt: string | null; deletedAt: string | null }>(
      existing.map((r: any) => [r.id, r]),
    );
    for (const row of rows) {
      if (rejected.has(row.id)) continue;
      const winner = this.lwwUpdate(row, existingMap.get(row.id));
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

  private async applySeriesRegistradas(tx: any, userId: string, rows: SyncRequest['changes']['seriesRegistradas'], now: Date) {
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
    this.skip('serieRegistrada', userId, rejected);

    const existing = rows.length === 0 ? [] : await tx.serieRegistrada.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
      select: { id: true, updatedAt: true, deletedAt: true },
    });
    const existingMap = new Map<string, { updatedAt: string | null; deletedAt: string | null }>(
      existing.map((r: any) => [r.id, r]),
    );
    for (const row of rows) {
      if (rejected.has(row.id)) continue;
      const winner = this.lwwUpdate(row, existingMap.get(row.id));
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

  private async applyRegistrosPeso(tx: any, userId: string, rows: SyncRequest['changes']['registrosPeso'], now: Date) {
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
    this.skip('registroPeso', userId, rejected);

    for (const row of rows) {
      if (rejected.has(row.id)) continue;
      const winner = this.lwwUpdate(row, existingMap.get(row.id));
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

  private async applyUserSettings(tx: any, userId: string, rows: SyncRequest['changes']['userSettings'], now: Date) {
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
        !existingRow || this.lwwTime(row) >= this.lwwTime(existingRow)
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

  private async applyExerciseAlternatives(
    tx: any,
    userId: string,
    rows: NonNullable<SyncRequest['changes']['exerciseAlternatives']>,
    now: Date,
  ) {
    // Ownership é estrutural: a PK composta inclui userId, então uma linha de
    // outro usuário é inalcançável — não há checagem de IDOR a fazer.
    const existing = rows.length === 0 ? [] : await tx.exerciseAlternative.findMany({
      where: {
        userId,
        OR: rows.map((r) => ({ exercicioId: r.exercicioId, alternativaId: r.alternativaId })),
      },
      select: { exercicioId: true, alternativaId: true, updatedAt: true, deletedAt: true },
    });
    const existingMap = new Map<string, { updatedAt: string | null; deletedAt: string | null }>(
      existing.map((r: any) => [`${r.exercicioId}|${r.alternativaId}`, r]),
    );

    for (const row of rows) {
      const winner = this.lwwUpdate(row, existingMap.get(`${row.exercicioId}|${row.alternativaId}`));
      await tx.exerciseAlternative.upsert({
        where: {
          userId_exercicioId_alternativaId: {
            userId, exercicioId: row.exercicioId, alternativaId: row.alternativaId,
          },
        },
        create: {
          userId, exercicioId: row.exercicioId, alternativaId: row.alternativaId,
          updatedAt: winner.updatedAt, deletedAt: winner.deletedAt,
          dirty: false, serverUpdatedAt: now,
        },
        update: {
          updatedAt: winner.updatedAt, deletedAt: winner.deletedAt,
          dirty: false, serverUpdatedAt: now,
        },
      });
    }
  }

  private async pullChanges(tx: any, userId: string, since: Date | null): Promise<SyncChanges> {
    const cursor = since ? { gt: since } : undefined;
    const where = (extra = {}) => ({ ...extra, serverUpdatedAt: cursor });

    const [exercises, treinos, treinoExercicios, sessaoTreinos,
           sessaoExercicios, seriesRegistradas, registrosPeso, userSettings,
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
      tx.registroPeso.findMany({ where: where({ userId }) }),
      tx.userSetting.findMany({ where: where({ userId }) }),
      tx.exerciseAlternative.findMany({ where: where({ userId }) }),
    ]);

    return {
      exercises: exercises.map(this.mapExercise),
      treinos: treinos.map(this.mapTreino),
      treinoExercicios: treinoExercicios.map(this.mapTreinoExercicio),
      sessaoTreinos: sessaoTreinos.map(this.mapSessaoTreino),
      sessaoExercicios: sessaoExercicios.map(this.mapSessaoExercicio),
      seriesRegistradas: seriesRegistradas.map(this.mapSerieRegistrada),
      registrosPeso: registrosPeso.map(this.mapRegistroPeso),
      userSettings: userSettings.map(this.mapUserSetting),
      exerciseAlternatives: exerciseAlternatives.map(this.mapExerciseAlternative),
    };
  }

  private mapExercise = (r: any) => ({
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

  private mapTreino = (r: any) => ({
    id: r.id, name: r.name, objetivo: r.objetivo,
    createdAt: r.createdAt, updatedAt: r.updatedAt, deletedAt: r.deletedAt,
  });

  private mapTreinoExercicio = (r: any) => ({
    id: r.id, treinoId: r.treinoId, exercicioId: r.exercicioId, ordem: r.ordem,
    seriesRecomendadas: r.seriesRecomendadas, execucoesRecomendadas: r.execucoesRecomendadas,
    cargaPadrao: r.cargaPadrao, tempoDescansoSegundos: r.tempoDescansoSegundos,
    metodo: r.metodo, grupoId: r.grupoId,
    duracaoRecomendadaSegundos: r.duracaoRecomendadaSegundos,
    distanciaRecomendadaMetros: r.distanciaRecomendadaMetros,
    intensidadeRecomendada: r.intensidadeRecomendada,
    updatedAt: r.updatedAt ?? '', deletedAt: r.deletedAt,
  });

  private mapSessaoTreino = (r: any) => ({
    id: r.id, treinoId: r.treinoId, treinoNomeSnapshot: r.treinoNomeSnapshot,
    dataHoraInicio: r.dataHoraInicio, dataHoraFim: r.dataHoraFim,
    status: r.status, arquivado: r.arquivado,
    createdAt: r.createdAt, updatedAt: r.updatedAt, deletedAt: r.deletedAt,
  });

  private mapSessaoExercicio = (r: any) => ({
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

  private mapSerieRegistrada = (r: any) => ({
    id: r.id, sessaoExercicioId: r.sessaoExercicioId, tipoSerie: r.tipoSerie,
    ordem: r.ordem, cargaKg: r.cargaKg, repeticoes: r.repeticoes,
    duracaoSegundos: r.duracaoSegundos, distanciaMetros: r.distanciaMetros,
    intensidade: r.intensidade,
    observacao: r.observacao, createdAt: r.createdAt,
    updatedAt: r.updatedAt, deletedAt: r.deletedAt,
  });

  private mapRegistroPeso = (r: any) => ({
    id: r.id, pesoKg: r.pesoKg, dataRegistro: r.dataRegistro,
    observacao: r.observacao, createdAt: r.createdAt,
    updatedAt: r.updatedAt, deletedAt: r.deletedAt,
  });

  private mapUserSetting = (r: any) => ({
    key: r.key, value: r.value, updatedAt: r.updatedAt ?? null, deletedAt: r.deletedAt,
  });

  private mapExerciseAlternative = (r: any) => ({
    exercicioId: r.exercicioId, alternativaId: r.alternativaId,
    updatedAt: r.updatedAt ?? null, deletedAt: r.deletedAt,
  });
}
