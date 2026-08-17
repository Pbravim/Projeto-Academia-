import { assertJwtSecret } from './jwt.config';

describe('assertJwtSecret', () => {
  const original = process.env.JWT_ACCESS_SECRET;
  afterEach(() => {
    process.env.JWT_ACCESS_SECRET = original;
  });

  it('devolve o secret quando válido (>= 32 chars)', () => {
    process.env.JWT_ACCESS_SECRET = 'a'.repeat(32);
    expect(assertJwtSecret()).toBe('a'.repeat(32));
  });

  it('lança quando ausente ou curto', () => {
    delete process.env.JWT_ACCESS_SECRET;
    expect(() => assertJwtSecret()).toThrow('JWT_ACCESS_SECRET');
    process.env.JWT_ACCESS_SECRET = 'curto';
    expect(() => assertJwtSecret()).toThrow('JWT_ACCESS_SECRET');
  });
});
