import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TreinosService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    return this.prisma.treino.findMany({
      where: { userId, deletedAt: null },
      include: { treinoExercicios: true },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string, userId: string) {
    return this.prisma.treino.findFirst({
      where: { id, userId, deletedAt: null },
      include: { treinoExercicios: true },
    });
  }
}
