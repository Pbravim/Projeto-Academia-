import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { SyncRequestDto } from './dto/sync-request.dto';
import { SyncService } from './sync.service';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  sync(@CurrentUser() user: { id: string }, @Body() body: SyncRequestDto) {
    // JwtStrategy.validate retorna o usuário Prisma (campo `id`), não `userId`.
    return this.syncService.sync(user.id, body);
  }
}
