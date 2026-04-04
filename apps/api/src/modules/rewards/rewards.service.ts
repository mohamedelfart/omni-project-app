import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfferDto } from './dto/rewards.dto';

@Injectable()
export class RewardsService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(userId: string) {
    return this.prisma.rewardsWallet.findUnique({
      where: { userId },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
  }

  createOffer(userId: string, dto: CreateOfferDto) {
    return this.prisma.offer.create({
      data: {
        createdByUserId: userId,
        title: dto.title,
        type: dto.type as never,
        discountMinor: dto.discountMinor,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
    });
  }
}