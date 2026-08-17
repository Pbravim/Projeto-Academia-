import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

const ctxFor = (headers: Record<string, string>) => {
  const request: any = { headers };
  return {
    ctx: { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext,
    request,
  };
};

describe('JwtAuthGuard (puro, sem passport)', () => {
  const users = { findById: jest.fn() };
  let guard: JwtAuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_ACCESS_SECRET = 's'.repeat(32);
    guard = new JwtAuthGuard(new JwtService({}), users as never);
  });

  it('401 sem Authorization ou sem Bearer', async () => {
    await expect(guard.canActivate(ctxFor({}).ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctxFor({ authorization: 'Basic abc' }).ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('401 com token inválido/expirado', async () => {
    await expect(guard.canActivate(ctxFor({ authorization: 'Bearer nao-e-jwt' }).ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('401 quando o usuário do token não existe mais', async () => {
    const token = new JwtService({}).sign({ sub: 'u1', email: 'a@b.com' }, { secret: 's'.repeat(32) });
    users.findById.mockResolvedValue(null);
    await expect(guard.canActivate(ctxFor({ authorization: `Bearer ${token}` }).ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('token válido popula request.user com o usuário do banco e retorna true', async () => {
    const token = new JwtService({}).sign({ sub: 'u1', email: 'a@b.com' }, { secret: 's'.repeat(32) });
    users.findById.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    const { ctx, request } = ctxFor({ authorization: `Bearer ${token}` });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'u1', email: 'a@b.com' }); // @CurrentUser() depende disso
    expect(users.findById).toHaveBeenCalledWith('u1');
  });
});
