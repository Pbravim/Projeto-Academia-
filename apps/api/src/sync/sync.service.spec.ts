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
});
