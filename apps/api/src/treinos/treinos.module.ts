import { Module } from '@nestjs/common';
import { TreinosService } from './treinos.service';
import { TreinosController } from './treinos.controller';

@Module({
  providers: [TreinosService],
  controllers: [TreinosController],
})
export class TreinosModule {}
