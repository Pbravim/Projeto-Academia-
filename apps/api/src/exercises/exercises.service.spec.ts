import { Test, TestingModule } from '@nestjs/testing';
import { ExercisesService } from './exercises.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  exercise: { findMany: jest.fn(), findFirst: jest.fn() },
};

describe('ExercisesService', () => {
  let service: ExercisesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExercisesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(ExercisesService);
  });

  it('listForUser returns the user\'s custom exercises + global catalogue, hiding tombstones', async () => {
    mockPrisma.exercise.findMany.mockResolvedValue([{ id: 'e1' }]);

    const result = await service.listForUser('user-1');

    expect(result).toEqual([{ id: 'e1' }]);
    expect(mockPrisma.exercise.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null, OR: [{ userId: 'user-1' }, { isCustom: false }] },
      orderBy: { name: 'asc' },
    });
  });

  it('findById scopes to owner or global catalogue and excludes deleted', async () => {
    mockPrisma.exercise.findFirst.mockResolvedValue({ id: 'e1' });

    const result = await service.findById('e1', 'user-1');

    expect(result).toEqual({ id: 'e1' });
    expect(mockPrisma.exercise.findFirst).toHaveBeenCalledWith({
      where: { id: 'e1', deletedAt: null, OR: [{ userId: 'user-1' }, { isCustom: false }] },
    });
  });

  it('findById returns null when nothing matches', async () => {
    mockPrisma.exercise.findFirst.mockResolvedValue(null);
    expect(await service.findById('nope', 'user-1')).toBeNull();
  });
});
