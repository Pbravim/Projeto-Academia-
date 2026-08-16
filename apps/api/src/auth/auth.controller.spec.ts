import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuth = { register: jest.fn(), login: jest.fn(), refresh: jest.fn() };

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuth }],
    })
      // Rate limiting é coberto por auth.throttle.spec.ts; aqui só a delegação.
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(AuthController);
  });

  it('register delegates email/password/name', async () => {
    mockAuth.register.mockResolvedValue({ accessToken: 'a' });
    await controller.register({ email: 'a@b.com', password: 'pw', name: 'Bravim' } as any);
    expect(mockAuth.register).toHaveBeenCalledWith('a@b.com', 'pw', 'Bravim');
  });

  it('login delegates the authenticated user id + email (from LocalStrategy)', async () => {
    mockAuth.login.mockResolvedValue({ accessToken: 'a' });
    await controller.login({ id: 'user-1', email: 'a@b.com' });
    expect(mockAuth.login).toHaveBeenCalledWith('user-1', 'a@b.com');
  });

  it('refresh delegates the refresh token', async () => {
    mockAuth.refresh.mockResolvedValue({ accessToken: 'a' });
    await controller.refresh({ refreshToken: 'rt' } as any);
    expect(mockAuth.refresh).toHaveBeenCalledWith('rt');
  });
});
