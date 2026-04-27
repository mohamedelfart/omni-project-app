import { ConflictException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RoleCode } from '@prisma/client';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'crypto';

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

type OtpMode = 'DEV' | 'PROD';

type OtpChallengeRecord = {
  codeHash: string;
  salt: string;
  expiresAt: number;
  attempts: number;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly otpChallenges = new Map<string, OtpChallengeRecord>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(payload: RegisterDto): Promise<{
    userId: string;
    onboardingRequired: boolean;
    verificationToken: string;
    accessToken: string;
    refreshToken: string;
  }> {
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
      include: { userRoles: { include: { role: true } } },
    });

    const verificationToken = await this.jwtService.signAsync(
      { sub: user.id, action: 'verify-account' },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: `${this.configService.get<number>('ACCOUNT_VERIFICATION_TTL_HOURS') ?? 24}h`,
      },
    );

    const roles = user.userRoles.map((entry) => this.toSharedRole(entry.role.code));
    const { accessToken, refreshToken } = await this.issueTokens(user.id, roles[0] ?? 'tenant', roles);

    return {
      userId: user.id,
      onboardingRequired: true,
      verificationToken,
      accessToken,
      refreshToken,
    };
  }

  async login(payload: LoginDto): Promise<AuthTokens> {
    try {
      this.logger.debug(`Login attempt email=${payload.email}`);
      const user = await this.prisma.user.findUnique({
        where: { email: payload.email },
        include: { userRoles: { include: { role: true } } },
      });
      this.logger.debug(`Login user lookup email=${payload.email} found=${Boolean(user)}`);

      const passwordHash = user?.passwordHash;
      const passwordMatches = typeof passwordHash === 'string' && this.verifySecret(payload.password, passwordHash);
      this.logger.debug(`Login password compare email=${payload.email} matched=${passwordMatches}`);

      if (!user?.passwordHash || !passwordMatches) {
        throw new UnauthorizedException('Invalid email or password');
      }

      await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

      const roles = user.userRoles.map((entry) => this.toSharedRole(entry.role.code));
      return this.issueTokens(user.id, roles[0] ?? 'tenant', roles);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Login failed email=${payload.email} error=${message}`, stack);
      throw error;
    }
  }

  async createGuestSession(): Promise<AuthTokens> {
    const guestId = `guest_${randomUUID()}`;
    await this.prisma.user.create({
      data: {
        id: guestId,
        fullName: 'Guest Session',
        countryCode: 'QA',
        isVerified: false,
        isProfileCompleted: false,
      },
    });
    return this.issueTokens(guestId, 'guest', ['guest'], { sessionType: 'guest' });
  }

  async requestPhoneOtp(payload: PhoneOtpRequestDto): Promise<{ challengeId: string; expiresInSeconds: number; devOtpCode?: string }> {
    this.cleanupExpiredOtpChallenges();

    const code = this.generateOtpCode();
    const expiresInSeconds = this.configService.get<number>('OTP_TTL_SECONDS') ?? 300;
    const challengeId = randomBytes(16).toString('hex');
    const salt = randomBytes(16).toString('hex');

    this.otpChallenges.set(payload.phoneNumber, {
      codeHash: this.hashOtpCode(code, salt),
      salt,
      expiresAt: Date.now() + expiresInSeconds * 1000,
      attempts: 0,
    });

    return {
      challengeId,
      expiresInSeconds,
      ...(this.getOtpMode() === 'DEV' ? { devOtpCode: code } : {}),
    };
  }

  async verifyPhoneOtp(payload: PhoneOtpVerifyDto): Promise<AuthTokens> {
    this.cleanupExpiredOtpChallenges();

    const challenge = this.otpChallenges.get(payload.phoneNumber);
    if (!challenge) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    if (challenge.expiresAt <= Date.now()) {
      this.otpChallenges.delete(payload.phoneNumber);
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const maxAttempts = this.configService.get<number>('OTP_MAX_ATTEMPTS') ?? 5;
    if (challenge.attempts >= maxAttempts) {
      this.otpChallenges.delete(payload.phoneNumber);
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const isValidOtp = this.verifyOtpCode(payload.otp, challenge.codeHash, challenge.salt);
    if (!isValidOtp) {
      challenge.attempts += 1;
      this.otpChallenges.set(payload.phoneNumber, challenge);
      throw new UnauthorizedException('Invalid OTP');
    }

    this.otpChallenges.delete(payload.phoneNumber);

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

  /**
   * Stateless refresh: verifies HS256 JWT signed with [JWT_REFRESH_SECRET], `type: 'refresh'`, and `exp`.
   * Rejects other tokens minted with the same secret (e.g. password-reset) that are not refresh sessions.
   */
  async refreshTokens(payload: RefreshTokenDto): Promise<AuthTokens> {
    type RefreshClaims = {
      sub: string;
      role?: UserRole;
      roles?: UserRole[];
      type?: string;
      typ?: string;
      sid?: string | null;
      jti?: string;
      sessionType?: string;
    };

    let decoded: RefreshClaims;
    try {
      decoded = await this.jwtService.verifyAsync<RefreshClaims>(payload.refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const refreshType = decoded.typ ?? decoded.type;
    if (refreshType !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const role = decoded.role ?? 'tenant';
    const roles = decoded.roles?.length ? decoded.roles : [role];

    const sessionType = decoded.sessionType === 'guest' ? 'guest' : undefined;
    return this.issueTokens(decoded.sub, role, roles, { sessionType });
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

  private async issueTokens(
    userId: string,
    role: UserRole,
    roles: UserRole[],
    options?: { sessionType?: 'guest'; sessionId?: string | null },
  ): Promise<AuthTokens> {
    const accessSecret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    const accessExpiresIn = this.configService.get<string>('JWT_ACCESS_TTL') ?? '15m';
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_TTL') ?? '7d';
    const sessionId = options?.sessionId ?? null;
    const accessJti = randomUUID();
    const refreshJti = randomUUID();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          role,
          roles,
          sid: sessionId,
          jti: accessJti,
          typ: 'access',
          ...(options?.sessionType ? { sessionType: options.sessionType } : {}),
        },
        { secret: accessSecret, expiresIn: accessExpiresIn },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          role,
          roles,
          sid: sessionId,
          jti: refreshJti,
          typ: 'refresh',
          // Keep legacy claim for backwards compatibility with old consumers.
          type: 'refresh',
          ...(options?.sessionType ? { sessionType: options.sessionType } : {}),
        },
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

  private generateOtpCode(): string {
    const raw = randomBytes(4).readUInt32BE(0) % 1_000_000;
    return raw.toString().padStart(6, '0');
  }

  private getOtpMode(): OtpMode {
    const mode = (this.configService.get<string>('OTP_MODE') ?? 'PROD').toUpperCase();
    return mode === 'DEV' ? 'DEV' : 'PROD';
  }

  private hashOtpCode(code: string, salt: string): string {
    return scryptSync(code, salt, 64).toString('hex');
  }

  private verifyOtpCode(value: string, codeHash: string, salt: string): boolean {
    const derived = scryptSync(value, salt, 64);
    const target = Buffer.from(codeHash, 'hex');
    return target.length === derived.length && timingSafeEqual(target, derived);
  }

  private cleanupExpiredOtpChallenges(): void {
    const now = Date.now();
    for (const [phoneNumber, challenge] of this.otpChallenges.entries()) {
      if (challenge.expiresAt <= now) {
        this.otpChallenges.delete(phoneNumber);
      }
    }
  }

  private verifySecret(value: string, storedValue: string): boolean {
    const [salt, hash] = storedValue.split(':');
    if (!salt || !hash) {
      return false;
    }
    if (!/^[0-9a-f]+$/i.test(salt) || !/^[0-9a-f]+$/i.test(hash) || hash.length !== 128) {
      return false;
    }
    const derived = scryptSync(value, salt, 64);
    const target = Buffer.from(hash, 'hex');
    if (target.length !== derived.length) {
      return false;
    }
    return timingSafeEqual(target, derived);
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
