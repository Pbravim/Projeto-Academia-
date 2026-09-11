import { createHash, randomUUID } from 'node:crypto';

import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    const isMatch = await bcrypt.compare(password, user.password);
    return isMatch ? user : null;
  }

  async register(email: string, password: string, name?: string) {
    const existing = await this.usersService.findByEmail(email);
    // Resposta genérica de propósito: um 409 "email already in use" confirma a
    // existência da conta para terceiros (enumeração). Combinado com o rate
    // limit do register, o custo de enumerar fica alto.
    if (existing) throw new BadRequestException('Nao foi possivel criar a conta com os dados informados.');
    const user = await this.usersService.create({ email, password, name });
    return this.generateTokens(user.id, user.email);
  }

  async login(userId: string, email: string) {
    return this.generateTokens(userId, email);
  }

  async refresh(refreshToken: string) {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: tokenHash },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.generateTokens(stored.userId, stored.user.email);
  }

  private async generateTokens(userId: string, email: string) {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_ACCESS_SECRET not set');
    const payload = { sub: userId, email };
    const accessToken = this.jwtService.sign(payload, {
      secret,
      // jsonwebtoken 9.0.3 (via @nestjs/jwt 12) estreitou `expiresIn` para o template
      // literal `StringValue` do `ms`; um `string` vindo de env não casa em compilação.
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as JwtSignOptions['expiresIn'],
    });
    const rawRefresh = randomUUID();
    const tokenHash = createHash('sha256').update(rawRefresh).digest('hex');
    const expiresAt = new Date();
    const refreshDays = Number(process.env.JWT_REFRESH_EXPIRES_IN_DAYS);
    expiresAt.setDate(expiresAt.getDate() + (Number.isFinite(refreshDays) && refreshDays > 0 ? refreshDays : 30));
    await this.prisma.refreshToken.create({
      data: { token: tokenHash, userId, expiresAt },
    });
    return { accessToken, refreshToken: rawRefresh }; // return raw, store hash
  }
}
