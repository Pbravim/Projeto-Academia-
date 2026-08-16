import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';

import { UsersService } from './users.service';

const mockPrisma = {
  user: { findUnique: jest.fn(), create: jest.fn() },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(UsersService);
  });

  it('findById queries by id', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    await service.findById('u1');
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' } });
  });

  it('findByEmail queries by email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    await service.findByEmail('a@b.com');
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'a@b.com' } });
  });

  it('create hashes the password (never stores plaintext)', async () => {
    mockPrisma.user.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'u1', ...data }));

    await service.create({ email: 'a@b.com', password: 'plaintext', name: 'Bravim' });

    const arg = mockPrisma.user.create.mock.calls[0][0];
    expect(arg.data.email).toBe('a@b.com');
    expect(arg.data.name).toBe('Bravim');
    expect(arg.data.password).not.toBe('plaintext');
    // hash deve bater com a senha original
    expect(await bcrypt.compare('plaintext', arg.data.password)).toBe(true);
  });

  it('usa bcrypt cost 12 (P3 rodada 3: 10 estava abaixo do recomendado)', async () => {
    mockPrisma.user.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'u1', ...data }));

    await service.create({ email: 'a@b.com', password: 'plaintext' });

    const arg = mockPrisma.user.create.mock.calls[0][0];
    expect(arg.data.password).toMatch(/^\$2[aby]\$12\$/);
  });
});
