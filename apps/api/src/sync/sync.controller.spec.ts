import { Test, TestingModule } from '@nestjs/testing';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import type { SyncRequest } from '@academia/contracts';

const mockSync = { sync: jest.fn() };

const emptyReq: SyncRequest = {
  since: null,
  changes: {
    exercises: [], treinos: [], treinoExercicios: [], sessaoTreinos: [],
    sessaoExercicios: [], seriesRegistradas: [], registrosPeso: [], userSettings: [],
    exerciseAlternatives: [],
  },
};

describe('SyncController', () => {
  let controller: SyncController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [{ provide: SyncService, useValue: mockSync }],
    }).compile();
    controller = module.get(SyncController);
  });

  it('forwards the authenticated user id (from JwtStrategy `id`, not `userId`)', async () => {
    mockSync.sync.mockResolvedValue({ serverChanges: emptyReq.changes, newCursor: 'c' });

    // JwtStrategy.validate retorna o usuário Prisma => campo `id`
    await controller.sync({ id: 'user-1' }, emptyReq);

    expect(mockSync.sync).toHaveBeenCalledWith('user-1', emptyReq);
    // regressão: garante que não voltamos a passar `undefined` (bug do user.userId)
    expect(mockSync.sync.mock.calls[0][0]).toBe('user-1');
  });
});
