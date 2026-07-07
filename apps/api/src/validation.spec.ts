import { BadRequestException } from '@nestjs/common';
import { buildValidationPipe } from './validation';
import { RegisterDto } from './auth/dto/register.dto';

// O pipe global precisa de forbidNonWhitelisted: campos desconhecidos devem ser
// rejeitados (400), não silenciosamente descartados — payloads malformados de
// clientes antigos/maliciosos falham cedo e com mensagem clara.
describe('buildValidationPipe', () => {
  const pipe = buildValidationPipe();
  const asBody = (value: unknown) =>
    pipe.transform(value, { type: 'body', metatype: RegisterDto });

  it('accepts a valid body', async () => {
    const result = await asBody({ email: 'a@b.com', password: 'senha-forte-123' });
    expect(result.email).toBe('a@b.com');
  });

  it('rejects unknown properties instead of silently stripping them', async () => {
    await expect(
      asBody({ email: 'a@b.com', password: 'senha-forte-123', isAdmin: true }),
    ).rejects.toThrow(BadRequestException);
  });
});
