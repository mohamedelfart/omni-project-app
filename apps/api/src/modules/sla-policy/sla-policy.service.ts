import { Injectable } from '@nestjs/common';
import type { Prisma, RequestPriority, SlaPolicyRule } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  COUNTRY_REGISTRY,
  getActiveCountryCode,
  getPreparedCountryDefinition,
} from '../operator-policy/country-configs/index';
import { QATAR_CONFIG } from '../operator-policy/country-configs/qatar.config';

export type ResolvedSla = {
  matchedRule: SlaPolicyRule | null;
  responseSlaMinutes: number;
  completionSlaMinutes: number;
};

function normalizeCountryForSla(country: string): string {
  const raw = country?.trim() ?? '';
  if (!raw) {
    return getActiveCountryCode();
  }

  const upper = raw.toUpperCase();
  const byCode = getPreparedCountryDefinition(upper);
  if (byCode) {
    return byCode.code;
  }

  const lower = raw.toLowerCase();
  for (const def of Object.values(COUNTRY_REGISTRY)) {
    if (def.name.toLowerCase() === lower) {
      return def.code;
    }
  }

  if (lower === 'egypt') {
    return 'EG';
  }
  if (lower === 'qatar') {
    return 'QA';
  }
  if (lower === 'uae' || lower === 'united arab emirates' || lower === 'emirates') {
    return 'AE';
  }
  if (lower === 'saudi arabia' || lower === 'ksa') {
    return 'SA';
  }

  return getActiveCountryCode();
}

@Injectable()
export class SlaPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * DB-first: newest active `SlaPolicyRule` for country + serviceType + priority at `at`.
   * Otherwise country-pack `slaFallbackMinutes` (then active-country pack).
   */
  async resolveSla(
    params: { countryCode: string; serviceType: string; priority: RequestPriority; at: Date },
    tx?: Prisma.TransactionClient,
  ): Promise<ResolvedSla> {
    const db = tx ?? this.prisma;
    const countryCode = normalizeCountryForSla(params.countryCode);
    const serviceType = params.serviceType.trim();

    const rule = await db.slaPolicyRule.findFirst({
      where: {
        countryCode,
        serviceType,
        priority: params.priority,
        isActive: true,
        effectiveFrom: { lte: params.at },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: params.at } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (rule) {
      return {
        matchedRule: rule,
        responseSlaMinutes: rule.responseSlaMinutes,
        completionSlaMinutes: rule.completionSlaMinutes,
      };
    }

    const pack =
      getPreparedCountryDefinition(countryCode) ??
      getPreparedCountryDefinition(getActiveCountryCode()) ??
      QATAR_CONFIG;

    return {
      matchedRule: null,
      responseSlaMinutes: pack.slaFallbackMinutes.responseSlaMinutes,
      completionSlaMinutes: pack.slaFallbackMinutes.completionSlaMinutes,
    };
  }
}
