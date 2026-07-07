import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SyncService } from './sync.service';
import { SyncRequestDto } from './dto/sync-request.dto';

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
