import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    return this.prisma.exercise.findMany({
      where: {
        deletedAt: null,
        OR: [{ userId }, { isCustom: false }],
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string, userId: string) {
    return this.prisma.exercise.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [{ userId }, { isCustom: false }],
      },
    });
  }
}
