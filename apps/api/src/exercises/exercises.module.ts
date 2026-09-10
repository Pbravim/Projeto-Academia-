import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';

@Module({
  imports: [AuthModule],
  providers: [ExercisesService],
  controllers: [ExercisesController],
})
export class ExercisesModule {}
