import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';

const mockPrisma = {
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

const mockUsers = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
};

const mockJwt = { sign: jest.fn().mockReturnValue('mock-token') };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UsersService, useValue: mockUsers },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('responds with a generic 400 for duplicate email (no account enumeration)', async () => {
      mockUsers.findByEmail.mockResolvedValueOnce({ id: '1', email: 'a@b.com' });

      // 409 "Email already in use" confirmava a existência da conta (enumeração).
      const error = await service.register('a@b.com', 'pass').catch((e) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(String(error.message).toLowerCase()).not.toContain('email');
      expect(String(error.message).toLowerCase()).not.toContain('use');
      expect(mockUsers.create).not.toHaveBeenCalled();
    });

    it('creates the user and returns access + raw refresh token, storing the hash', async () => {
      mockUsers.findByEmail.mockResolvedValueOnce(null);
      mockUsers.create.mockResolvedValueOnce({ id: 'u1', email: 'a@b.com' });

      const tokens = await service.register('a@b.com', 'pass', 'Alice');

      expect(mockUsers.create).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pass', name: 'Alice' });
      expect(tokens.accessToken).toBe('mock-token');
      expect(typeof tokens.refreshToken).toBe('string');
      // The DB must store the SHA-256 hash, never the raw token.
      const stored = mockPrisma.refreshToken.create.mock.calls[0][0].data.token;
      expect(stored).toBe(createHash('sha256').update(tokens.refreshToken).digest('hex'));
      expect(stored).not.toBe(tokens.refreshToken);
    });

    it('throws if JWT_ACCESS_SECRET is not configured', async () => {
      delete process.env.JWT_ACCESS_SECRET;
      mockUsers.findByEmail.mockResolvedValueOnce(null);
      mockUsers.create.mockResolvedValueOnce({ id: 'u1', email: 'a@b.com' });
      await expect(service.register('a@b.com', 'pass')).rejects.toThrow('JWT_ACCESS_SECRET');
    });
  });

  describe('validateUser', () => {
    it('returns the user when the password matches', async () => {
      const hash = await bcrypt.hash('correct', 10);
      mockUsers.findByEmail.mockResolvedValueOnce({ id: 'u1', email: 'a@b.com', password: hash });
      const user = await service.validateUser('a@b.com', 'correct');
      expect(user).toMatchObject({ id: 'u1' });
    });

    it('returns null when the password does not match', async () => {
      const hash = await bcrypt.hash('correct', 10);
      mockUsers.findByEmail.mockResolvedValueOnce({ id: 'u1', email: 'a@b.com', password: hash });
      expect(await service.validateUser('a@b.com', 'wrong')).toBeNull();
    });

    it('returns null when the user does not exist', async () => {
      mockUsers.findByEmail.mockResolvedValueOnce(null);
      expect(await service.validateUser('missing@b.com', 'x')).toBeNull();
    });
  });

  describe('refresh token expiry', () => {
    it('respeita JWT_REFRESH_EXPIRES_IN_DAYS da env (era 30 hardcoded)', async () => {
      process.env.JWT_REFRESH_EXPIRES_IN_DAYS = '7';
      mockUsers.findByEmail.mockResolvedValueOnce(null);
      mockUsers.create.mockResolvedValueOnce({ id: 'u1', email: 'a@b.com' });

      await service.register('a@b.com', 'pass');

      const expiresAt: Date = mockPrisma.refreshToken.create.mock.calls[0][0].data.expiresAt;
      const days = (expiresAt.getTime() - Date.now()) / 86_400_000;
      expect(days).toBeGreaterThan(6.9);
      expect(days).toBeLessThan(7.1);
      delete process.env.JWT_REFRESH_EXPIRES_IN_DAYS;
    });
  });

  describe('refresh', () => {
    it('rotates a valid refresh token: deletes the old one and issues new tokens', async () => {
      const raw = 'raw-refresh';
      const hash = createHash('sha256').update(raw).digest('hex');
      mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
        id: 'rt1', token: hash, userId: 'u1', expiresAt: new Date(Date.now() + 60_000),
        user: { email: 'a@b.com' },
      });

      const tokens = await service.refresh(raw);

      // Looked up by hash, not the raw token.
      expect(mockPrisma.refreshToken.findUnique.mock.calls[0][0].where).toEqual({ token: hash });
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt1' } });
      expect(tokens.accessToken).toBe('mock-token');
    });

    it('throws UnauthorizedException for an unknown refresh token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValueOnce(null);
      await expect(service.refresh('nope')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for an expired refresh token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
        id: 'rt1', token: 'h', userId: 'u1', expiresAt: new Date(Date.now() - 60_000),
        user: { email: 'a@b.com' },
      });
      await expect(service.refresh('raw')).rejects.toThrow(UnauthorizedException);
      expect(mockPrisma.refreshToken.delete).not.toHaveBeenCalled();
    });
  });
});
