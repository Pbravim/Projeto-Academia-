import { Test, TestingModule } from '@nestjs/testing';

import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';

const mockService = { listForUser: jest.fn(), findById: jest.fn() };

describe('ExercisesController', () => {
  let controller: ExercisesController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExercisesController],
      providers: [{ provide: ExercisesService, useValue: mockService }],
    }).compile();
    controller = module.get(ExercisesController);
  });

  it('list delegates with the current user id', async () => {
    mockService.listForUser.mockResolvedValue([{ id: 'e1' }]);
    const result = await controller.list({ id: 'user-1' });
    expect(result).toEqual([{ id: 'e1' }]);
    expect(mockService.listForUser).toHaveBeenCalledWith('user-1');
  });

  it('findOne delegates with the param id and current user id', async () => {
    mockService.findById.mockResolvedValue({ id: 'e1' });
    await controller.findOne('e1', { id: 'user-1' });
    expect(mockService.findById).toHaveBeenCalledWith('e1', 'user-1');
  });
});
