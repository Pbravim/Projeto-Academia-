import type { SyncRequest } from '@academia/contracts';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';

import { SyncService } from './sync.service';

const makePrisma = () => ({
  $transaction: jest.fn(),
  exercise: { upsert: jest.fn(), findMany: jest.fn().mockImplementation((args: any) => {
    // Return empty by default for ownership checks
    return Promise.resolve([]);
  }) },
  treino: { upsert: jest.fn(), findMany: jest.fn().mockImplementation((args: any) => {
    // Return empty by default for ownership checks
    return Promise.resolve([]);
  }) },
  treinoExercicio: { upsert: jest.fn(), findMany: jest.fn().mockImplementation((args: any) => {
    // Return empty by default for ownership checks
    return Promise.resolve([]);
  }) },
  sessaoTreino: { upsert: jest.fn(), findMany: jest.fn().mockImplementation((args: any) => {
    // Return empty by default for ownership checks
    return Promise.resolve([]);
  }) },
  sessaoExercicio: { upsert: jest.fn(), findMany: jest.fn().mockImplementation((args: any) => {
    // Return empty by default for ownership checks
    return Promise.resolve([]);
  }) },
  serieRegistrada: { upsert: jest.fn(), findMany: jest.fn().mockImplementation((args: any) => {
    // Return empty by default for ownership checks
    return Promise.resolve([]);
  }) },
  serieSegmento: { upsert: jest.fn(), findMany: jest.fn().mockImplementation((args: any) => {
    // Return empty by default for ownership checks
    return Promise.resolve([]);
  }) },
  registroPeso: { upsert: jest.fn(), findMany: jest.fn().mockImplementation((args: any) => {
    // Return empty by default for ownership checks
    return Promise.resolve([]);
  }) },
  userSetting: { upsert: jest.fn(), findMany: jest.fn().mockImplementation((args: any) => {
    // Return empty by default for ownership checks
    return Promise.resolve([]);
  }) },
  exerciseAlternative: { upsert: jest.fn(), findMany: jest.fn().mockImplementation(() => {
    return Promise.resolve([]);
  }) },
});

describe('SyncService', () => {
  let service: SyncService;
  let mockPrisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    mockPrisma = makePrisma();
    mockPrisma.$transaction.mockImplementation((fn: (tx: any) => Promise<any>) =>
      fn(mockPrisma),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<SyncService>(SyncService);
  });

  const emptyChanges = (): SyncRequest['changes'] => ({
    exercises: [],
    treinos: [],
    treinoExercicios: [],
    sessaoTreinos: [],
    sessaoExercicios: [],
    seriesRegistradas: [],
    serieSegmentos: [],
    registrosPeso: [],
    userSettings: [],
    exerciseAlternatives: [],
  });

  it('upserta vínculos de alternativa por usuário e os devolve no pull', async () => {
    const T = '2026-07-07T10:00:00.000Z';
    mockPrisma.exerciseAlternative.findMany
      .mockResolvedValueOnce([]) // lookup do apply (nenhuma linha existente)
      .mockResolvedValueOnce([   // pull
        { userId: 'user-1', exercicioId: 'ex-c', alternativaId: 'ex-d', updatedAt: T, deletedAt: null },
      ]);

    const result = await service.sync('user-1', {
      since: null,
      changes: {
        ...emptyChanges(),
        exerciseAlternatives: [{ exercicioId: 'ex-a', alternativaId: 'ex-b', updatedAt: T, deletedAt: null }],
      },
    });

    const call = mockPrisma.exerciseAlternative.upsert.mock.calls[0][0];
    expect(call.where).toEqual({
      userId_exercicioId_alternativaId: { userId: 'user-1', exercicioId: 'ex-a', alternativaId: 'ex-b' },
    });
    expect(call.create.userId).toBe('user-1');

    expect(result.serverChanges.exerciseAlternatives).toEqual([
      { exercicioId: 'ex-c', alternativaId: 'ex-d', updatedAt: T, deletedAt: null },
    ]);
  });

  it('tolera push de cliente antigo sem o campo exerciseAlternatives', async () => {
    const changes = emptyChanges();
    delete (changes as Partial<SyncRequest['changes']>).exerciseAlternatives;

    const result = await service.sync('user-1', { since: null, changes });
    expect(result.serverChanges.exerciseAlternatives).toEqual([]);
  });

  it('returns empty serverChanges and a cursor when no changes exist', async () => {
    const result = await service.sync('user-1', {
      since: null,
      changes: emptyChanges(),
    });
    expect(result.serverChanges.exercises).toEqual([]);
    expect(typeof result.newCursor).toBe('string');
    expect(result.newCursor).toMatch(/^\d{4}-/);
  });

  it('returns a cursor with a safety margin so concurrent commits are not skipped', async () => {
    const before = Date.now();
    const result = await service.sync('user-1', { since: null, changes: emptyChanges() });
    // A transaction on another device may commit rows stamped up to ~txTimeout before
    // our own `now`; the cursor must sit at least 10s in the past to re-cover that window.
    expect(new Date(result.newCursor).getTime()).toBeLessThanOrEqual(before - 9_000);
  });

  it('never moves the cursor backwards past the client since', async () => {
    const since = new Date().toISOString(); // fresh cursor from a sync moments ago
    const result = await service.sync('user-1', { since, changes: emptyChanges() });
    expect(new Date(result.newCursor).getTime()).toBeGreaterThanOrEqual(new Date(since).getTime());
  });

  it('clamps a future client updatedAt/deletedAt to the server clock (clock skew)', async () => {
    // Relógio do device 2h adiantado: sem clamp, essa linha vence QUALQUER edição
    // legítima das próximas 2h em todos os outros devices (LWW invertido).
    const future = new Date(Date.now() + 2 * 3600_000).toISOString();
    await service.sync('user-1', {
      since: null,
      changes: {
        ...emptyChanges(),
        treinos: [{ id: 'treino-1', name: 'Skew', objetivo: null, createdAt: future, updatedAt: future, deletedAt: future }],
      },
    });

    const call = mockPrisma.treino.upsert.mock.calls[0][0];
    expect(new Date(call.create.updatedAt).getTime()).toBeLessThanOrEqual(Date.now());
    expect(new Date(call.create.deletedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('upserts an incoming treino row', async () => {
    const now = new Date().toISOString();
    await service.sync('user-1', {
      since: null,
      changes: {
        ...emptyChanges(),
        treinos: [{ id: 'treino-1', name: 'Peito', objetivo: null, createdAt: now, updatedAt: now, deletedAt: null }],
      },
    });
    expect(mockPrisma.treino.upsert).toHaveBeenCalledTimes(1);
    const call = mockPrisma.treino.upsert.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'treino-1' });
    expect(call.create.name).toBe('Peito');
    expect(call.create.userId).toBe('user-1');
  });

  it('does not overwrite a newer server row (LWW)', async () => {
    const serverTime = '2026-06-05T12:00:00.000Z';
    const clientTime = '2026-06-05T10:00:00.000Z';
    // First call: userId-scoped findMany, returns the row
    // Second call: all-db findMany for ownership check, returns the same row
    mockPrisma.treino.findMany
      .mockResolvedValueOnce([
        { id: 'treino-1', name: 'Server version', updatedAt: serverTime, deletedAt: null, userId: 'user-1', objetivo: null, createdAt: serverTime, serverUpdatedAt: new Date() },
      ])
      .mockResolvedValueOnce([
        { id: 'treino-1' },
      ]);
    await service.sync('user-1', {
      since: null,
      changes: {
        ...emptyChanges(),
        treinos: [{ id: 'treino-1', name: 'Client version', objetivo: null, createdAt: clientTime, updatedAt: clientTime, deletedAt: null }],
      },
    });
    const call = mockPrisma.treino.upsert.mock.calls[0][0];
    expect(call.update.name).toBe('Server version');
  });

  it('skips a treino owned by another user instead of aborting the whole push', async () => {
    // treino exists in DB but belongs to a different user (not returned in userId-scoped query)
    mockPrisma.treino.findMany
      .mockResolvedValueOnce([]) // userId-scoped query returns nothing (not owned by user-1)
      .mockResolvedValueOnce([{ id: 'treino-other' }]); // all-ids query finds it (belongs to someone else)

    const result = await service.sync('user-1', {
      since: null,
      changes: {
        ...emptyChanges(),
        treinos: [{ id: 'treino-other', name: 'Stolen', objetivo: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: null }],
      },
    });

    // Uma linha rejeitada não pode envenenar a conta: o push completa (200) e a
    // linha ofensora simplesmente não é gravada.
    expect(mockPrisma.treino.upsert).not.toHaveBeenCalled();
    expect(typeof result.newCursor).toBe('string');
  });

  it('applies the owned rows of a batch even when another row is rejected', async () => {
    const now = new Date().toISOString();
    mockPrisma.treino.findMany
      .mockResolvedValueOnce([]) // nenhum dos 2 ids pertence ao user-1
      .mockResolvedValueOnce([{ id: 'treino-other' }]); // só o alheio já existe no DB

    await service.sync('user-1', {
      since: null,
      changes: {
        ...emptyChanges(),
        treinos: [
          { id: 'treino-other', name: 'Stolen', objetivo: null, createdAt: now, updatedAt: now, deletedAt: null },
          { id: 'treino-mine', name: 'Meu novo', objetivo: null, createdAt: now, updatedAt: now, deletedAt: null },
        ],
      },
    });

    expect(mockPrisma.treino.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.treino.upsert.mock.calls[0][0].where).toEqual({ id: 'treino-mine' });
  });

  it('lets a newer incoming tombstone win over an older server edit (LWW)', async () => {
    const serverTime = '2026-06-05T10:00:00.000Z';
    const clientDeleteTime = '2026-06-05T12:00:00.000Z'; // newer delete
    mockPrisma.treino.findMany
      .mockResolvedValueOnce([
        { id: 'treino-1', name: 'Server', updatedAt: serverTime, deletedAt: null },
      ])
      .mockResolvedValueOnce([{ id: 'treino-1' }]);

    await service.sync('user-1', {
      since: null,
      changes: {
        ...emptyChanges(),
        treinos: [{ id: 'treino-1', name: 'Server', objetivo: null, createdAt: serverTime, updatedAt: clientDeleteTime, deletedAt: clientDeleteTime }],
      },
    });

    const call = mockPrisma.treino.upsert.mock.calls[0][0];
    expect(call.update.deletedAt).toBe(clientDeleteTime);
  });

  it('does not let an older incoming tombstone kill a newer server edit (LWW for deletes)', async () => {
    const serverEditTime = '2026-06-05T12:00:00.000Z';
    const clientDeleteTime = '2026-06-05T10:00:00.000Z'; // older delete must lose
    mockPrisma.treino.findMany
      .mockResolvedValueOnce([
        { id: 'treino-1', name: 'Server edit', updatedAt: serverEditTime, deletedAt: null },
      ])
      .mockResolvedValueOnce([{ id: 'treino-1' }]);

    await service.sync('user-1', {
      since: null,
      changes: {
        ...emptyChanges(),
        treinos: [{ id: 'treino-1', name: 'Old name', objetivo: null, createdAt: clientDeleteTime, updatedAt: clientDeleteTime, deletedAt: clientDeleteTime }],
      },
    });

    const call = mockPrisma.treino.upsert.mock.calls[0][0];
    expect(call.update.deletedAt).toBeNull();
    expect(call.update.name).toBe('Server edit');
  });

  it('does not resurrect a newer server tombstone with an older incoming edit', async () => {
    const serverDeleteTime = '2026-06-05T12:00:00.000Z';
    const clientEditTime = '2026-06-05T10:00:00.000Z'; // older edit must lose
    mockPrisma.treino.findMany
      .mockResolvedValueOnce([
        { id: 'treino-1', name: 'Deleted', updatedAt: '2026-06-05T09:00:00.000Z', deletedAt: serverDeleteTime },
      ])
      .mockResolvedValueOnce([{ id: 'treino-1' }]);

    await service.sync('user-1', {
      since: null,
      changes: {
        ...emptyChanges(),
        treinos: [{ id: 'treino-1', name: 'Resurrected', objetivo: null, createdAt: clientEditTime, updatedAt: clientEditTime, deletedAt: null }],
      },
    });

    const call = mockPrisma.treino.upsert.mock.calls[0][0];
    expect(call.update.deletedAt).toBe(serverDeleteTime);
  });

  it('applies LWW to userSettings tombstones too (older delete loses)', async () => {
    const serverEditTime = '2026-06-05T12:00:00.000Z';
    const clientDeleteTime = '2026-06-05T10:00:00.000Z';
    mockPrisma.userSetting.findMany.mockResolvedValueOnce([
      { key: 'theme', value: 'dark', updatedAt: serverEditTime, deletedAt: null },
    ]);

    await service.sync('user-1', {
      since: null,
      changes: {
        ...emptyChanges(),
        userSettings: [{ key: 'theme', value: 'dark', updatedAt: clientDeleteTime, deletedAt: clientDeleteTime }],
      },
    });

    const call = mockPrisma.userSetting.upsert.mock.calls[0][0];
    expect(call.update.deletedAt).toBeNull();
  });

  it('round-trips a cardio serie (null carga/reps, duration+intensity) on push', async () => {
    const now = '2026-06-14T10:00:00.000Z';
    // parent sessaoExercicio is owned by user-1
    mockPrisma.sessaoExercicio.findMany.mockResolvedValueOnce([{ id: 'se-1' }]);

    await service.sync('user-1', {
      since: null,
      changes: {
        ...emptyChanges(),
        seriesRegistradas: [{
          id: 'serie-1', sessaoExercicioId: 'se-1', tipoSerie: 'valida', ordem: 1,
          cargaKg: null, repeticoes: null,
          duracaoSegundos: 600, distanciaMetros: 1500, intensidade: 8,
          observacao: null, createdAt: now, updatedAt: now, deletedAt: null,
        }],
      },
    });

    const create = mockPrisma.serieRegistrada.upsert.mock.calls[0][0].create;
    expect(create).toMatchObject({
      cargaKg: null, repeticoes: null,
      duracaoSegundos: 600, distanciaMetros: 1500, intensidade: 8,
    });
  });

  it('passes trackingTypeSnapshot + non-strength recommendations through on sessaoExercicio push', async () => {
    const now = '2026-06-14T10:00:00.000Z';
    mockPrisma.sessaoTreino.findMany.mockResolvedValueOnce([{ id: 'st-1' }]); // owned parent

    await service.sync('user-1', {
      since: null,
      changes: {
        ...emptyChanges(),
        sessaoExercicios: [{
          id: 'se-1', sessaoTreinoId: 'st-1', exercicioId: 'ex-1', ordem: 1,
          nomeSnapshot: 'Esteira', grupoMuscularSnapshot: 'Cardio', categoriaSnapshot: 'Cardio',
          equipamentoSnapshot: 'Esteira', musculoAlvoSnapshot: null, nomeOriginalSnapshot: null,
          movementPatternSnapshot: 'Locomotion',
          realizado: true, seriesRecomendadas: null, execucoesRecomendadas: null,
          cargaPadrao: null, tempoDescansoSegundos: null, metodo: 'normal', grupoId: null,
          substituidoPorExercicioId: null, substituicaoMotivo: null,
          trackingTypeSnapshot: 'cardio', duracaoRecomendadaSegundos: 1200,
          distanciaRecomendadaMetros: 3000, intensidadeRecomendada: 7,
          createdAt: now, updatedAt: now, deletedAt: null,
        }],
      },
    });

    const call = mockPrisma.sessaoExercicio.upsert.mock.calls[0][0];
    expect(call.create).toMatchObject({
      trackingTypeSnapshot: 'cardio', duracaoRecomendadaSegundos: 1200,
      distanciaRecomendadaMetros: 3000, intensidadeRecomendada: 7,
      movementPatternSnapshot: 'Locomotion',
    });
    expect(call.update).toMatchObject({ movementPatternSnapshot: 'Locomotion' });
  });

  it('passes biomechanical exercise fields through on custom exercise push', async () => {
    const now = '2026-06-20T10:00:00.000Z';
    await service.sync('user-1', {
      since: null,
      changes: {
        ...emptyChanges(),
        exercises: [{
          id: 'ex-1', name: 'Supino', normalizedName: 'supino', groupMuscle: 'Peito',
          category: '', equipment: 'Barra', loadUnit: 'kg', isCustom: true,
          mediaOnline: null, mediaLocal: null, musculoAlvo: '["Peitoral maior"]',
          movementPattern: 'Horizontal Push', stabilizers: '["Triceps"]',
          executionType: 'Bilateral', nameVariations: '["Bench Press"]',
          primaryEquipment: 'Barbell', secondaryEquipment: 'Bench',
          catalogVersion: 3, trackingType: 'reps_load',
          createdAt: now, updatedAt: now, deletedAt: null,
        }],
      },
    });

    const fields = {
      movementPattern: 'Horizontal Push', stabilizers: '["Triceps"]',
      executionType: 'Bilateral', nameVariations: '["Bench Press"]',
      primaryEquipment: 'Barbell', secondaryEquipment: 'Bench',
      catalogVersion: 3, trackingType: 'reps_load',
    };
    const call = mockPrisma.exercise.upsert.mock.calls[0][0];
    expect(call.create).toMatchObject(fields);
    expect(call.update).toMatchObject(fields);
  });

  it('skips a serie targeting a sessaoExercicio the user does not own (no abort)', async () => {
    mockPrisma.sessaoExercicio.findMany.mockResolvedValueOnce([]); // parent not owned

    const result = await service.sync('user-1', {
      since: null,
      changes: {
        ...emptyChanges(),
        seriesRegistradas: [{
          id: 'serie-x', sessaoExercicioId: 'se-not-mine', tipoSerie: 'valida', ordem: 1,
          cargaKg: 80, repeticoes: 8, duracaoSegundos: null, distanciaMetros: null,
          intensidade: null, observacao: null,
          createdAt: '2026-06-14T10:00:00.000Z', updatedAt: '2026-06-14T10:00:00.000Z', deletedAt: null,
        }],
      },
    });

    expect(mockPrisma.serieRegistrada.upsert).not.toHaveBeenCalled();
    expect(typeof result.newCursor).toBe('string');
  });

  it('upserts a serieSegmento whose série is owned by the user', async () => {
    const now = '2026-09-12T10:00:00.000Z';
    mockPrisma.serieRegistrada.findMany.mockResolvedValueOnce([{ id: 'serie-1' }]); // owned parent

    await service.sync('user-1', {
      since: null,
      changes: {
        ...emptyChanges(),
        serieSegmentos: [{
          id: 'seg-1', serieId: 'serie-1', ordem: 2,
          cargaKg: 40, repeticoes: 6, descansoSegundos: 30,
          createdAt: now, updatedAt: now, deletedAt: null,
        }],
      },
    });

    expect(mockPrisma.serieSegmento.upsert).toHaveBeenCalledTimes(1);
    const call = mockPrisma.serieSegmento.upsert.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'seg-1' });
    expect(call.create).toMatchObject({ serieId: 'serie-1', ordem: 2, cargaKg: 40, repeticoes: 6, descansoSegundos: 30 });
  });

  it('skips a serieSegmento whose série belongs to another user (no abort)', async () => {
    mockPrisma.serieRegistrada.findMany.mockResolvedValueOnce([]); // parent not owned

    const result = await service.sync('user-1', {
      since: null,
      changes: {
        ...emptyChanges(),
        serieSegmentos: [{
          id: 'seg-x', serieId: 'serie-not-mine', ordem: 2,
          cargaKg: 40, repeticoes: 6, descansoSegundos: 30,
          createdAt: '2026-09-12T10:00:00.000Z', updatedAt: '2026-09-12T10:00:00.000Z', deletedAt: null,
        }],
      },
    });

    expect(mockPrisma.serieSegmento.upsert).not.toHaveBeenCalled();
    expect(typeof result.newCursor).toBe('string');
  });

  it('lets a newer incoming serieSegmento tombstone win over an older server edit (LWW)', async () => {
    const serverTime = '2026-09-12T10:00:00.000Z';
    const clientDeleteTime = '2026-09-12T12:00:00.000Z';
    mockPrisma.serieRegistrada.findMany.mockResolvedValueOnce([{ id: 'serie-1' }]);
    mockPrisma.serieSegmento.findMany
      .mockResolvedValueOnce([{ id: 'seg-1', serieId: 'serie-1', updatedAt: serverTime, deletedAt: null }])
      .mockResolvedValueOnce([{ id: 'seg-1', updatedAt: serverTime, deletedAt: null }]);

    await service.sync('user-1', {
      since: null,
      changes: {
        ...emptyChanges(),
        serieSegmentos: [{
          id: 'seg-1', serieId: 'serie-1', ordem: 2,
          cargaKg: 40, repeticoes: 6, descansoSegundos: 30,
          createdAt: serverTime, updatedAt: clientDeleteTime, deletedAt: clientDeleteTime,
        }],
      },
    });

    const call = mockPrisma.serieSegmento.upsert.mock.calls[0][0];
    expect(call.update.deletedAt).toBe(clientDeleteTime);
  });

  it('pulls serieSegmentos filtered by cursor and mapped', async () => {
    const since = '2026-09-10T00:00:00.000Z';
    mockPrisma.serieSegmento.findMany.mockResolvedValueOnce([{
      id: 'seg-1', serieId: 'serie-1', ordem: 2,
      cargaKg: 40, repeticoes: 6, descansoSegundos: 30,
      createdAt: since, updatedAt: since, deletedAt: null,
    }]);

    const result = await service.sync('user-1', { since, changes: emptyChanges() });

    const pullWhere = mockPrisma.serieSegmento.findMany.mock.calls[0][0].where;
    expect(pullWhere.serverUpdatedAt).toEqual({ gt: new Date(since) });
    expect(result.serverChanges.serieSegmentos[0]).toMatchObject({ id: 'seg-1', ordem: 2, cargaKg: 40 });
  });

  it('tolera push de cliente antigo sem o campo serieSegmentos', async () => {
    const changes = emptyChanges();
    delete (changes as Partial<SyncRequest['changes']>).serieSegmentos;

    const result = await service.sync('user-1', { since: null, changes });
    expect(result.serverChanges.serieSegmentos).toEqual([]);
  });

  it('pulls server changes filtered by the since cursor and maps the 5b fields', async () => {
    const since = '2026-06-10T00:00:00.000Z';
    mockPrisma.serieRegistrada.findMany.mockResolvedValueOnce([{
      id: 'serie-1', sessaoExercicioId: 'se-1', tipoSerie: 'valida', ordem: 1,
      cargaKg: null, repeticoes: null, duracaoSegundos: 45, distanciaMetros: null,
      intensidade: null, observacao: null,
      createdAt: since, updatedAt: since, deletedAt: null,
    }]);

    const result = await service.sync('user-1', { since, changes: emptyChanges() });

    // pull query must use a `gt` cursor over serverUpdatedAt
    const pullWhere = mockPrisma.serieRegistrada.findMany.mock.calls[0][0].where;
    expect(pullWhere.serverUpdatedAt).toEqual({ gt: new Date(since) });
    expect(result.serverChanges.seriesRegistradas[0]).toMatchObject({
      id: 'serie-1', duracaoSegundos: 45, cargaKg: null,
    });
  });
});
