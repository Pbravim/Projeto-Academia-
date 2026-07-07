import { Test } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import request = require('supertest');
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthModule } from './auth.module';
import { LocalAuthGuard } from './guards/local-auth.guard';

describe('Auth rate limiting', () => {
  let app: INestApplication;
  const mockAuth = {
    register: jest.fn().mockResolvedValue({ id: 'u1' }),
    login: jest.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r' }),
    refresh: jest.fn().mockResolvedValue({ accessToken: 'a' }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      // Storage/options infra for the guard; the limits under test live on the controller.
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1000 }])],
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuth }],
    })
      .overrideGuard(LocalAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          ctx.switchToHttp().getRequest().user = { id: 'u1', email: 'a@a.com' };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 429 after 5 login attempts from the same IP within the window', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'a@a.com', password: 'wrong' })
        .expect(200);
    }
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'a@a.com', password: 'wrong' })
      .expect(429);
  });

  it('returns 429 after 5 register attempts from the same IP within the window', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: `x${i}@a.com`, password: 'senha-forte-123' })
        .expect(201);
    }
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'x9@a.com', password: 'senha-forte-123' })
      .expect(429);
  });

  it('wires ThrottlerModule into AuthModule (production module, not just this test)', () => {
    const imports: any[] = Reflect.getMetadata('imports', AuthModule) ?? [];
    const names = imports.map((m: any) => (m?.module ?? m)?.name);
    expect(names).toContain('ThrottlerModule');
  });
});
