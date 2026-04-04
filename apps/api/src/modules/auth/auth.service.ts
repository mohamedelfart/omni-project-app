import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RoleCode } from '@prisma/client';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

import { AuthTokens, UserRole } from '@quickrent/shared-types';

import { PrismaService } from '../prisma/prisma.service';
import {
  CompleteProfileDto,
  ForgotPasswordDto,
  LoginDto,
  LogoutDto,
  PhoneOtpRequestDto,
  PhoneOtpVerifyDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyAccountDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(payload: RegisterDto): Promise<{ userId: string; onboardingRequired: boolean; verificationToken: string }> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: payload.email }, payload.phoneNumber ? { phoneNumber: payload.phoneNumber } : undefined].filter(Boolean) as never,
      },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const tenantRole = await this.prisma.role.findUnique({ where: { code: RoleCode.TENANT } });
    if (!tenantRole) {
      throw new NotFoundException('Tenant role not configured');
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

    const verificationToken = await this.jwtService.signAsync(
      { sub: user.id, action: 'verify-account' },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: `${this.configService.get<number>('ACCOUNT_VERIFICATION_TTL_HOURS') ?? 24}h`,
      },
    );

    return {
      userId: user.id,
      onboardingRequired: true,
      verificationToken,
    };
  }

  async login(payload: LoginDto): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: payload.email },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user?.passwordHash || !this.verifySecret(payload.password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const roles = user.userRoles.map((entry) => this.toSharedRole(entry.role.code));
    return this.issueTokens(user.id, roles[0] ?? 'tenant', roles);
  }

  async requestPhoneOtp(payload: PhoneOtpRequestDto): Promise<{ challengeId: string; expiresInSeconds: number; devOtpCode: string }> {
    const code = '246810';
    const challengeId = await this.jwtService.signAsync(
      { phoneNumber: payload.phoneNumber, otp: code, action: 'verify-phone' },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: `${this.configService.get<number>('OTP_TTL_SECONDS') ?? 300}s`,
      },
    );

    return {
      challengeId,
      expiresInSeconds: this.configService.get<number>('OTP_TTL_SECONDS') ?? 300,
      devOtpCode: code,
    };
  }

  async verifyPhoneOtp(payload: PhoneOtpVerifyDto): Promise<AuthTokens> {
    if (payload.otp !== '246810') {
      throw new UnauthorizedException('Invalid OTP');
    }

    let user = await this.prisma.user.findUnique({
      where: { phoneNumber: payload.phoneNumber },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user) {
      const tenantRole = await this.prisma.role.findUniqueOrThrow({ where: { code: RoleCode.TENANT } });
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

  async refresh(payload: RefreshTokenDto): Promise<AuthTokens> {
    const decoded = await this.jwtService.verifyAsync<{ sub: string; role: UserRole; roles?: UserRole[] }>(
      payload.refreshToken,
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      },
    );

    return this.issueTokens(decoded.sub, decoded.role, decoded.roles ?? [decoded.role]);
  }

  async verifyAccount(payload: VerifyAccountDto): Promise<{ verified: boolean }> {
    const decoded = await this.jwtService.verifyAsync<{ sub: string }>(payload.token, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });

    await this.prisma.user.update({ where: { id: decoded.sub }, data: { isVerified: true } });
    return { verified: true };
  }

  async forgotPassword(payload: ForgotPasswordDto): Promise<{ accepted: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { email: payload.email } });
    if (!user) {
      return { accepted: true };
    }

    const resetToken = await this.jwtService.signAsync(
      { sub: user.id, action: 'reset-password' },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: `${this.configService.get<number>('PASSWORD_RESET_TTL_MINUTES') ?? 30}m`,
      },
    );

    return { accepted: Boolean(resetToken) };
  }

  async resetPassword(payload: ResetPasswordDto): Promise<{ success: boolean }> {
    const decoded = await this.jwtService.verifyAsync<{ sub: string }>(payload.token, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });

    await this.prisma.user.update({
      where: { id: decoded.sub },
      data: { passwordHash: this.hashSecret(payload.newPassword) },
    });

    return { success: true };
  }

  async logout(userId: string, _payload: LogoutDto): Promise<{ success: boolean; userId: string }> {
    return { success: true, userId };
  }

  async completeProfile(userId: string, payload: CompleteProfileDto): Promise<{ completed: boolean }> {
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

  private async issueTokens(userId: string, role: UserRole, roles: UserRole[]): Promise<AuthTokens> {
    const accessSecret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    const accessExpiresIn = this.configService.get<string>('JWT_ACCESS_TTL') ?? '15m';
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_TTL') ?? '30d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({ sub: userId, role, roles }, { secret: accessSecret, expiresIn: accessExpiresIn }),
      this.jwtService.signAsync(
        { sub: userId, role, roles, type: 'refresh' },
        { secret: refreshSecret, expiresIn: refreshExpiresIn },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private hashSecret(value: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(value, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  private verifySecret(value: string, storedValue: string): boolean {
    const [salt, hash] = storedValue.split(':');
    if (!salt || !hash) {
      return false;
    }
    const derived = scryptSync(value, salt, 64);
    return timingSafeEqual(Buffer.from(hash, 'hex'), derived);
  }

  private toSharedRole(roleCode: RoleCode): UserRole {
    switch (roleCode) {
      case RoleCode.ADMIN:
        return 'admin';
      case RoleCode.COMMAND_CENTER:
        return 'command-center';
      case RoleCode.LANDLORD:
        return 'tenant';
      case RoleCode.PROVIDER:
        return 'provider';
      default:
        return 'tenant';
    }
  }
}
