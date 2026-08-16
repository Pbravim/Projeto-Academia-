import { Module } from '@nestjs/common';

import { TreinosController } from './treinos.controller';
import { TreinosService } from './treinos.service';

@Module({
  providers: [TreinosService],
  controllers: [TreinosController],
})
export class TreinosModule {}
