import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsQueryDto } from './dto/notifications-query.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findForUser(userId: string, query: NotificationsQueryDto) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        isRead: query.isRead === undefined ? undefined : query.isRead === 'true',
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(userId: string, notificationId: string, isRead: boolean) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead },
    });
  }

  async pushInternalNotification(params: {
    userId: string;
    title: string;
    body: string;
    type?: 'Info' | 'Alert' | 'OrderStatus' | 'Stock' | 'System';
    payload?: Record<string, unknown>;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        body: params.body,
        type: params.type ?? 'Info',
        payload: params.payload as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
