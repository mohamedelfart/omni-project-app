"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
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
    async getUserById(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                userRoles: { include: { role: true } },
                tenantProfile: true,
                providerProfiles: { include: { provider: true } },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async updateTenantProfile(userId, dto) {
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
    async assignRole(userId, dto) {
        const role = await this.prisma.role.findUnique({ where: { code: dto.roleCode } });
        if (!role) {
            throw new common_1.NotFoundException('Role not found');
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
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
