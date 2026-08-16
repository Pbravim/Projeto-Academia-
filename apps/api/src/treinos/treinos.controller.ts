import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { TreinosService } from './treinos.service';

@ApiTags('treinos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('treinos')
export class TreinosController {
  constructor(private readonly treinos: TreinosService) {}

  @Get()
  list(@CurrentUser() user: { id: string }) {
    return this.treinos.listForUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.treinos.findById(id, user.id);
  }
}
