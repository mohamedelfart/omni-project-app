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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
let AuthService = class AuthService {
    prisma;
    jwtService;
    configService;
    constructor(prisma, jwtService, configService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async register(payload) {
        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [{ email: payload.email }, payload.phoneNumber ? { phoneNumber: payload.phoneNumber } : undefined].filter(Boolean),
            },
        });
        if (existingUser) {
            throw new common_1.ConflictException('User already exists');
        }
        const tenantRole = await this.prisma.role.findUnique({ where: { code: client_1.RoleCode.TENANT } });
        if (!tenantRole) {
            throw new common_1.NotFoundException('Tenant role not configured');
        }
        const user = await this.prisma.user.create({
            data: {
                email: payload.email,
                phoneNumber: payload.phoneNumber,
                fullName: payload.fullName,
                passwordHash: this.hashSecret(payload.password),
                countryCode: 'QA',
                userRoles: { create: [{ roleId: tenantRole.id }] },
                tenantProfile: { create: { preferredLanguage: 'en' } },
            },
        });
        const verificationToken = await this.jwtService.signAsync({ sub: user.id, action: 'verify-account' }, {
            secret: this.configService.getOrThrow('JWT_ACCESS_SECRET'),
            expiresIn: `${this.configService.get('ACCOUNT_VERIFICATION_TTL_HOURS') ?? 24}h`,
        });
        return {
            userId: user.id,
            onboardingRequired: true,
            verificationToken,
        };
    }
    async login(payload) {
        const user = await this.prisma.user.findUnique({
            where: { email: payload.email },
            include: { userRoles: { include: { role: true } } },
        });
        if (!user?.passwordHash || !this.verifySecret(payload.password, user.passwordHash)) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        const roles = user.userRoles.map((entry) => this.toSharedRole(entry.role.code));
        return this.issueTokens(user.id, roles[0] ?? 'tenant', roles);
    }
    async requestPhoneOtp(payload) {
        const code = '246810';
        const challengeId = await this.jwtService.signAsync({ phoneNumber: payload.phoneNumber, otp: code, action: 'verify-phone' }, {
            secret: this.configService.getOrThrow('JWT_ACCESS_SECRET'),
            expiresIn: `${this.configService.get('OTP_TTL_SECONDS') ?? 300}s`,
        });
        return {
            challengeId,
            expiresInSeconds: this.configService.get('OTP_TTL_SECONDS') ?? 300,
            devOtpCode: code,
        };
    }
    async verifyPhoneOtp(payload) {
        if (payload.otp !== '246810') {
            throw new common_1.UnauthorizedException('Invalid OTP');
        }
        let user = await this.prisma.user.findUnique({
            where: { phoneNumber: payload.phoneNumber },
            include: { userRoles: { include: { role: true } } },
        });
        if (!user) {
            const tenantRole = await this.prisma.role.findUniqueOrThrow({ where: { code: client_1.RoleCode.TENANT } });
            user = await this.prisma.user.create({
                data: {
                    phoneNumber: payload.phoneNumber,
                    fullName: `Tenant ${payload.phoneNumber.slice(-4)}`,
                    countryCode: 'QA',
                    isVerified: true,
                    userRoles: { create: [{ roleId: tenantRole.id }] },
                    tenantProfile: { create: { preferredLanguage: 'en' } },
                },
                include: { userRoles: { include: { role: true } } },
            });
        }
        const roles = user.userRoles.map((entry) => this.toSharedRole(entry.role.code));
        return this.issueTokens(user.id, roles[0] ?? 'tenant', roles);
    }
    async refresh(payload) {
        const decoded = await this.jwtService.verifyAsync(payload.refreshToken, {
            secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
        });
        return this.issueTokens(decoded.sub, decoded.role, decoded.roles ?? [decoded.role]);
    }
    async verifyAccount(payload) {
        const decoded = await this.jwtService.verifyAsync(payload.token, {
            secret: this.configService.getOrThrow('JWT_ACCESS_SECRET'),
        });
        await this.prisma.user.update({ where: { id: decoded.sub }, data: { isVerified: true } });
        return { verified: true };
    }
    async forgotPassword(payload) {
        const user = await this.prisma.user.findUnique({ where: { email: payload.email } });
        if (!user) {
            return { accepted: true };
        }
        const resetToken = await this.jwtService.signAsync({ sub: user.id, action: 'reset-password' }, {
            secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
            expiresIn: `${this.configService.get('PASSWORD_RESET_TTL_MINUTES') ?? 30}m`,
        });
        return { accepted: Boolean(resetToken) };
    }
    async resetPassword(payload) {
        const decoded = await this.jwtService.verifyAsync(payload.token, {
            secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
        });
        await this.prisma.user.update({
            where: { id: decoded.sub },
            data: { passwordHash: this.hashSecret(payload.newPassword) },
        });
        return { success: true };
    }
    async logout(userId, _payload) {
        return { success: true, userId };
    }
    async completeProfile(userId, payload) {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                fullName: payload.fullName,
                avatarUrl: payload.avatarUrl,
                isProfileCompleted: true,
                tenantProfile: payload.preferredCity
                    ? {
                        upsert: {
                            update: { preferredCity: payload.preferredCity },
                            create: { preferredLanguage: 'en', preferredCity: payload.preferredCity },
                        },
                    }
                    : undefined,
            },
        });
        return { completed: true };
    }
    async issueTokens(userId, role, roles) {
        const accessSecret = this.configService.getOrThrow('JWT_ACCESS_SECRET');
        const refreshSecret = this.configService.getOrThrow('JWT_REFRESH_SECRET');
        const accessExpiresIn = this.configService.get('JWT_ACCESS_TTL') ?? '15m';
        const refreshExpiresIn = this.configService.get('JWT_REFRESH_TTL') ?? '30d';
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync({ sub: userId, role, roles }, { secret: accessSecret, expiresIn: accessExpiresIn }),
            this.jwtService.signAsync({ sub: userId, role, roles, type: 'refresh' }, { secret: refreshSecret, expiresIn: refreshExpiresIn }),
        ]);
        return { accessToken, refreshToken };
    }
    hashSecret(value) {
        const salt = (0, crypto_1.randomBytes)(16).toString('hex');
        const hash = (0, crypto_1.scryptSync)(value, salt, 64).toString('hex');
        return `${salt}:${hash}`;
    }
    verifySecret(value, storedValue) {
        const [salt, hash] = storedValue.split(':');
        if (!salt || !hash) {
            return false;
        }
        const derived = (0, crypto_1.scryptSync)(value, salt, 64);
        return (0, crypto_1.timingSafeEqual)(Buffer.from(hash, 'hex'), derived);
    }
    toSharedRole(roleCode) {
        switch (roleCode) {
            case client_1.RoleCode.ADMIN:
                return 'admin';
            case client_1.RoleCode.COMMAND_CENTER:
                return 'command-center';
            case client_1.RoleCode.LANDLORD:
                return 'tenant';
            case client_1.RoleCode.PROVIDER:
                return 'provider';
            default:
                return 'tenant';
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
