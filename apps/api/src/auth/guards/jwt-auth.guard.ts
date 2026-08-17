import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/users.service';
import { assertJwtSecret } from '../jwt.config';

/**
 * Guard JWT puro (substitui passport-jwt): extrai o Bearer, verifica assinatura
 * e expiração e carrega o usuário do banco — request.user é o usuário Prisma
 * completo, como o JwtStrategy.validate devolvia.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const [scheme, token] = String(request.headers['authorization'] ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException();

    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: string }>(token, { secret: assertJwtSecret() });
    } catch {
      throw new UnauthorizedException();
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException();
    request.user = user;
    return true;
  }
}
