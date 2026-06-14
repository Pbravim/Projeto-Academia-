import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { SyncService } from './sync.service';
import { PrismaService } from '../prisma/prisma.service';
import type { SyncRequest } from '@academia/contracts';

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
  registroPeso: { upsert: jest.fn(), findMany: jest.fn().mockImplementation((args: any) => {
    // Return empty by default for ownership checks
    return Promise.resolve([]);
  }) },
  userSetting: { upsert: jest.fn(), findMany: jest.fn().mockImplementation((args: any) => {
    // Return empty by default for ownership checks
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
    registrosPeso: [],
    userSettings: [],
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

  it('throws ForbiddenException when client tries to modify another user\'s treino', async () => {
    // treino exists in DB but belongs to a different user (not returned in userId-scoped query)
    mockPrisma.treino.findMany
      .mockResolvedValueOnce([]) // userId-scoped query returns nothing (not owned by user-1)
      .mockResolvedValueOnce([{ id: 'treino-other' }]); // all-ids query finds it (belongs to someone else)

    await expect(
      service.sync('user-1', {
        since: null,
        changes: {
          ...emptyChanges(),
          treinos: [{ id: 'treino-other', name: 'Stolen', objetivo: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: null }],
        },
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lets an incoming tombstone win even when the server row is newer', async () => {
    const serverTime = '2026-06-05T12:00:00.000Z';
    const clientDeleteTime = '2026-06-05T10:00:00.000Z'; // older, but a delete
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
          realizado: true, seriesRecomendadas: null, execucoesRecomendadas: null,
          cargaPadrao: null, tempoDescansoSegundos: null, metodo: 'normal', grupoId: null,
          substituidoPorExercicioId: null, substituicaoMotivo: null,
          trackingTypeSnapshot: 'cardio', duracaoRecomendadaSegundos: 1200,
          distanciaRecomendadaMetros: 3000, intensidadeRecomendada: 7,
          createdAt: now, updatedAt: now, deletedAt: null,
        }],
      },
    });

    const create = mockPrisma.sessaoExercicio.upsert.mock.calls[0][0].create;
    expect(create).toMatchObject({
      trackingTypeSnapshot: 'cardio', duracaoRecomendadaSegundos: 1200,
      distanciaRecomendadaMetros: 3000, intensidadeRecomendada: 7,
    });
  });

  it('throws ForbiddenException when a serie targets a sessaoExercicio the user does not own', async () => {
    mockPrisma.sessaoExercicio.findMany.mockResolvedValueOnce([]); // parent not owned

    await expect(
      service.sync('user-1', {
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
      }),
    ).rejects.toThrow(ForbiddenException);
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
