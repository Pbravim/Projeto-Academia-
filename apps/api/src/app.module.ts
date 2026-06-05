import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ExercisesModule } from './exercises/exercises.module';
import { TreinosModule } from './treinos/treinos.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    ExercisesModule,
    TreinosModule,
  ],
})
export class AppModule {}
