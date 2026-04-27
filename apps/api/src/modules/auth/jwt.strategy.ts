import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UserRole } from '@quickrent/shared-types';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: { sub: string; role: UserRole; roles?: UserRole[]; sid?: string | null }) {
    await this.validateSessionStrict(payload);
    return {
      id: payload.sub,
      role: payload.role,
      roles: payload.roles ?? [payload.role],
    };
  }

  private async validateSessionStrict(payload: { sub: string; sid?: string | null }): Promise<void> {
    const sid = typeof payload.sid === 'string' && payload.sid.trim() ? payload.sid.trim() : null;
    if (!sid) {
      // Legacy access tokens without sid remain valid during migration.
      return;
    }

    const session = await this.prisma.session.findFirst({
      where: { id: sid, userId: payload.sub },
      select: {
        id: true,
        revokedAt: true,
        expiresAt: true,
      },
    });

    if (!session) {
      this.logger.warn(
        JSON.stringify({
          event: 'auth.session.validation',
          outcome: 'missing_session',
          strict: true,
          sid,
          userId: payload.sub,
        }),
      );
      throw new UnauthorizedException('Session is invalid');
    }

    if (session.revokedAt) {
      this.logger.warn(
        JSON.stringify({
          event: 'auth.session.validation',
          outcome: 'revoked_session',
          strict: true,
          sid,
          userId: payload.sub,
          revokedAt: session.revokedAt.toISOString(),
        }),
      );
      throw new UnauthorizedException('Session is revoked');
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      this.logger.warn(
        JSON.stringify({
          event: 'auth.session.validation',
          outcome: 'expired_session',
          strict: true,
          sid,
          userId: payload.sub,
          expiresAt: session.expiresAt.toISOString(),
        }),
      );
      throw new UnauthorizedException('Session is expired');
    }

    this.logger.debug(
      JSON.stringify({
        event: 'auth.session.validation',
        outcome: 'valid_session',
        strict: true,
        sid,
        userId: payload.sub,
      }),
    );
  }
}
