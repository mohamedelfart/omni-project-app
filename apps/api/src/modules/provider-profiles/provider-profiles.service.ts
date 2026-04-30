import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type ProviderMembershipRow = {
  providerId: string;
  providerName: string;
  providerType: string;
  city: string | null;
  serviceTypes: string[];
  profileTitle: string;
  isPrimaryContact: boolean;
};

@Injectable()
export class ProviderProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async listMembershipsForUser(userId: string): Promise<ProviderMembershipRow[]> {
    const rows = await this.prisma.providerProfile.findMany({
      where: { userId },
      select: {
        title: true,
        isPrimaryContact: true,
        provider: {
          select: {
            id: true,
            name: true,
            providerType: true,
            city: true,
            serviceTypes: true,
          },
        },
      },
      orderBy: [{ isPrimaryContact: 'desc' }, { providerId: 'asc' }],
    });

    return rows.map((row) => ({
      providerId: row.provider.id,
      providerName: row.provider.name,
      providerType: row.provider.providerType,
      city: row.provider.city,
      serviceTypes: row.provider.serviceTypes,
      profileTitle: row.title,
      isPrimaryContact: row.isPrimaryContact,
    }));
  }
}
