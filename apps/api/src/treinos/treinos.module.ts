import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { TreinosController } from './treinos.controller';
import { TreinosService } from './treinos.service';

@Module({
  imports: [AuthModule],
  providers: [TreinosService],
  controllers: [TreinosController],
})
export class TreinosModule {}
