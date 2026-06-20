import { Test, TestingModule } from '@nestjs/testing';
import { TreinosController } from './treinos.controller';
import { TreinosService } from './treinos.service';

const mockService = { listForUser: jest.fn(), findById: jest.fn() };

describe('TreinosController', () => {
  let controller: TreinosController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TreinosController],
      providers: [{ provide: TreinosService, useValue: mockService }],
    }).compile();
    controller = module.get(TreinosController);
  });

  it('list delegates with the current user id', async () => {
    mockService.listForUser.mockResolvedValue([{ id: 't1' }]);
    const result = await controller.list({ id: 'user-1' });
    expect(result).toEqual([{ id: 't1' }]);
    expect(mockService.listForUser).toHaveBeenCalledWith('user-1');
  });

  it('findOne delegates with the param id and current user id', async () => {
    mockService.findById.mockResolvedValue({ id: 't1' });
    await controller.findOne('t1', { id: 'user-1' });
    expect(mockService.findById).toHaveBeenCalledWith('t1', 'user-1');
  });
});
