import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [PrismaModule],
  providers: [SyncService],
  controllers: [SyncController],
})
export class SyncModule {}
