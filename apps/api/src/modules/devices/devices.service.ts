import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async registerPushToken(userId: string, token: string, platform: string) {
    return this.prisma.pushToken.upsert({
      where: { token },
      update: {
        userId,
        platform,
        lastSeenAt: new Date(),
      },
      create: {
        userId,
        token,
        platform,
      },
    });
  }
}