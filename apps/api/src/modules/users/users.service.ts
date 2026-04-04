import { Injectable, NotFoundException } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AssignRoleDto, UpdateTenantProfileDto } from './dto/profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  listUsers() {
    return this.prisma.user.findMany({
      include: {
        userRoles: { include: { role: true } },
        tenantProfile: true,
        providerProfiles: { include: { provider: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: { include: { role: true } },
        tenantProfile: true,
        providerProfiles: { include: { provider: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateTenantProfile(userId: string, dto: UpdateTenantProfileDto) {
    return this.prisma.tenantProfile.upsert({
      where: { userId },
      update: {
        preferredCity: dto.preferredCity,
        preferredDistricts: dto.preferredDistricts,
      },
      create: {
        userId,
        preferredLanguage: 'en',
        preferredCity: dto.preferredCity,
        preferredDistricts: dto.preferredDistricts ?? [],
      },
    });
  }

  async assignRole(userId: string, dto: AssignRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { code: dto.roleCode as RoleCode } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      update: {},
      create: { userId, roleId: role.id },
      include: { role: true },
    });
  }

  listRoles() {
    return this.prisma.role.findMany({ orderBy: { code: 'asc' } });
  }
}