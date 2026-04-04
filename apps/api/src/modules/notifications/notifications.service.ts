import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BroadcastNotificationDto } from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(userId: string) {
    return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async broadcast(dto: BroadcastNotificationDto) {
    const users = await this.prisma.user.findMany({ select: { id: true } });
    await this.prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        title: dto.title,
        body: dto.body,
        channel: 'IN_APP',
      })),
    });

    return { queued: users.length };
  }
}