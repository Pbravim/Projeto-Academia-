import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';

import { UsersModule } from '../users/users.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    JwtModule.register({}),
    UsersModule,
    // Storage/options for the ThrottlerGuard applied on AuthController (brute-force guard).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }]),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  // Guards puros são instanciados no módulo CONSUMIDOR: exportar JwtModule e
  // UsersModule é o que permite `@UseGuards(JwtAuthGuard)` em sync/treinos/exercises.
  exports: [AuthService, JwtModule, UsersModule],
})
export class AuthModule {}
