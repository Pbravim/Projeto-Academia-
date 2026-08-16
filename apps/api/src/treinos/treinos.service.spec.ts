import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';

import { TreinosService } from './treinos.service';

const mockPrisma = {
  treino: { findMany: jest.fn(), findFirst: jest.fn() },
};

describe('TreinosService', () => {
  let service: TreinosService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TreinosService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(TreinosService);
  });

  it('listForUser scopes to the user, hides tombstones, includes exercicios', async () => {
    mockPrisma.treino.findMany.mockResolvedValue([{ id: 't1', treinoExercicios: [] }]);

    const result = await service.listForUser('user-1');

    expect(result).toEqual([{ id: 't1', treinoExercicios: [] }]);
    expect(mockPrisma.treino.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', deletedAt: null },
      include: { treinoExercicios: true },
      orderBy: { name: 'asc' },
    });
  });

  it('findById scopes to owner + not deleted and includes exercicios', async () => {
    mockPrisma.treino.findFirst.mockResolvedValue({ id: 't1', treinoExercicios: [] });

    await service.findById('t1', 'user-1');

    expect(mockPrisma.treino.findFirst).toHaveBeenCalledWith({
      where: { id: 't1', userId: 'user-1', deletedAt: null },
      include: { treinoExercicios: true },
    });
  });

  it('findById returns null when nothing matches', async () => {
    mockPrisma.treino.findFirst.mockResolvedValue(null);
    expect(await service.findById('nope', 'user-1')).toBeNull();
  });
});
