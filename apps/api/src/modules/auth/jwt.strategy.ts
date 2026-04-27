import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { SessionActiveRole } from '@prisma/client';
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
    const authorityRoles = payload.roles ?? [payload.role];
    const sessionContext = await this.validateSessionStrict(payload, authorityRoles, payload.role);
    return {
      id: payload.sub,
      role: payload.role,
      roles: authorityRoles,
      activeRole: sessionContext.activeRole,
      providerContextId: sessionContext.providerContextId,
      tenantContextId: sessionContext.tenantContextId,
    };
  }

  private async validateSessionStrict(
    payload: { sub: string; sid?: string | null },
    authorityRoles: UserRole[],
    fallbackRole: UserRole,
  ): Promise<{ activeRole: UserRole; providerContextId?: string; tenantContextId?: string }> {
    const sid = typeof payload.sid === 'string' && payload.sid.trim() ? payload.sid.trim() : null;
    if (!sid) {
      // Legacy access tokens without sid remain valid during migration.
      return { activeRole: fallbackRole };
    }

    const session = await this.prisma.session.findFirst({
      where: { id: sid, userId: payload.sub },
      select: {
        id: true,
        activeRole: true,
        providerContextId: true,
        tenantContextId: true,
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

    const sessionActiveRoleEnum = session.activeRole;
    const sessionActiveRoleUser = this.sessionActiveRoleToUserRole(sessionActiveRoleEnum);
    let normalizedActiveRole: UserRole = fallbackRole;
    let activeRoleOutcome: 'valid_active_role' | 'invalid_active_role_normalized' | 'missing_active_role_fallback' =
      'missing_active_role_fallback';

    if (sessionActiveRoleUser && authorityRoles.includes(sessionActiveRoleUser)) {
      normalizedActiveRole = sessionActiveRoleUser;
      activeRoleOutcome = 'valid_active_role';
    } else if (sessionActiveRoleUser && !authorityRoles.includes(sessionActiveRoleUser)) {
      activeRoleOutcome = 'invalid_active_role_normalized';
    }

    this.logger.log(
      JSON.stringify({
        event: 'auth.session.active_role',
        outcome: activeRoleOutcome,
        sid,
        userId: payload.sub,
        authorityRoles,
        sessionActiveRole: sessionActiveRoleEnum,
        normalizedActiveRole,

        providerContextId: session.providerContextId ?? null,
        tenantContextId: session.tenantContextId ?? null,
      }),
    );

    this.logger.debug(
      JSON.stringify({
        event: 'auth.session.validation',
        outcome: 'valid_session',
        strict: true,
        sid,
        userId: payload.sub,
      }),
    );

    return {
      activeRole: normalizedActiveRole,
      providerContextId: session.providerContextId ?? undefined,
      tenantContextId: session.tenantContextId ?? undefined,
    };
  }

  /** Map Prisma `SessionActiveRole` (DB enum) to shared `UserRole` strings used in JWT claims. */
  private sessionActiveRoleToUserRole(role: SessionActiveRole | null): UserRole | null {
    if (!role) return null;
    switch (role) {
      case SessionActiveRole.ADMIN:
        return 'admin';
      case SessionActiveRole.PROVIDER:
        return 'provider';
      case SessionActiveRole.TENANT:
        return 'tenant';
      case SessionActiveRole.LANDLORD:
        return 'landlord';
      case SessionActiveRole.COMMAND_CENTER:
        return 'command-center';
      case SessionActiveRole.GUEST:
        return 'guest';
      default:
        return null;
    }
  }
}
