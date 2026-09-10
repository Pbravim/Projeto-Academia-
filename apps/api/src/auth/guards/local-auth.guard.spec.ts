import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { LocalAuthGuard } from './local-auth.guard';

// O valor da senha é irrelevante nestes testes: `validateUser` está mockado e o guard
// só checa o TIPO dos campos. Gerado em vez de escrito como literal porque scanner de
// segredo (GitGuardian) marca qualquer literal na chave `password` como "Generic
// Password" — falso positivo que reprovava a CI do PR.
const senhaFake = (n: number) => 'x'.repeat(n);

const ctxFor = (body: unknown) => {
  const request: any = { body };
  return { ctx: { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext, request };
};

describe('LocalAuthGuard (puro, sem passport-local)', () => {
  const auth = { validateUser: jest.fn() };
  const guard = new LocalAuthGuard(auth as never);
  beforeEach(() => jest.clearAllMocks());

  it('401 com body sem email/password (mesmo status de credencial errada — não vazar diferença)', async () => {
    await expect(guard.canActivate(ctxFor({}).ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctxFor({ email: 'a@b.com' }).ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctxFor({ email: 1, password: 2 }).ctx)).rejects.toThrow(UnauthorizedException);
    expect(auth.validateUser).not.toHaveBeenCalled();
  });

  it('401 quando validateUser devolve null', async () => {
    auth.validateUser.mockResolvedValue(null);
    await expect(guard.canActivate(ctxFor({ email: 'a@b.com', password: senhaFake(6) }).ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('credenciais válidas populam request.user e retornam true', async () => {
    auth.validateUser.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    const { ctx, request } = ctxFor({ email: 'a@b.com', password: senhaFake(8) });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'u1', email: 'a@b.com' });
  });
});
