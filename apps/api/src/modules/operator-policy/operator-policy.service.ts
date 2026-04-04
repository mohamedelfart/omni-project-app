import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { getCountryDefinition, getSupportedCountryCodes } from './country-configs/index';

export interface OperatorServiceRule {
  serviceType: string;
  enabled: boolean;
  category: 'free' | 'paid' | 'hybrid';
  basePriceMinor: number;
  freeCapMinor: number;
  requiresVendor: boolean;
}

@Injectable()
export class OperatorPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditTrailService: AuditTrailService,
  ) {}

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
  }

  getFeatureFlags() {
    return {
      communityEnabled: this.configService.get<string>('COMMUNITY_MODULE_ENABLED') === 'true',
      temporaryStayExchangeEnabled: this.configService.get<string>('TEMP_STAY_EXCHANGE_ENABLED') === 'true',
      miniAirbnbEnabled: this.configService.get<string>('MINI_AIRBNB_ENABLED') === 'true',
      publicServicesIntegrationEnabled: this.configService.get<string>('PUBLIC_SERVICES_INTEGRATION_ENABLED') === 'true',
    };
  }

  getSupportedCountries() {
    return getSupportedCountryCodes().map((code) => {
      const def = getCountryDefinition(code);
      return {
        code,
        name: def?.name ?? code,
        currency: def?.defaultCurrency ?? 'USD',
        cities: def?.cities ?? [],
      };
    });
  }

  async getCountryConfig(countryCode: string) {
    const existing = await this.prisma.countryConfig.findUnique({ where: { code: countryCode } });
    if (existing) {
      return existing;
    }

    return this.prisma.countryConfig.create({
      data: {
        code: countryCode,
        name: countryCode,
        defaultCurrency: countryCode === 'QA' ? 'QAR' : 'USD',
        timezone: 'UTC',
        defaultLanguage: 'en',
        supportedLanguages: ['en'],
      },
    });
  }

  async upsertCountryConfig(
    actorUserId: string,
    countryCode: string,
    payload: Partial<{
      name: string;
      defaultCurrency: string;
      timezone: string;
      defaultLanguage: string;
      supportedLanguages: string[];
      taxPercent: number;
      maintenanceSlaHours: number;
      freeMoveInCapMinor: number;
      googleRegionCode: string;
    }>,
  ) {
    const updated = await this.prisma.countryConfig.upsert({
      where: { code: countryCode },
      update: payload,
      create: {
        code: countryCode,
        name: payload.name ?? countryCode,
        defaultCurrency: payload.defaultCurrency ?? (countryCode === 'QA' ? 'QAR' : 'USD'),
        timezone: payload.timezone ?? 'UTC',
        defaultLanguage: payload.defaultLanguage ?? 'en',
        supportedLanguages: payload.supportedLanguages ?? ['en'],
        taxPercent: payload.taxPercent ?? 0,
        maintenanceSlaHours: payload.maintenanceSlaHours ?? 24,
        freeMoveInCapMinor: payload.freeMoveInCapMinor ?? 50000,
        googleRegionCode: payload.googleRegionCode,
      },
    });

    await this.auditTrailService.write({
      actorUserId,
      action: 'COUNTRY_CONFIG_UPDATED',
      entity: 'CountryConfig',
      entityId: countryCode,
      countryCode,
      metadata: payload as Record<string, unknown>,
    });

    return updated;
  }

  async getCountryServiceRules(countryCode: string): Promise<OperatorServiceRule[]> {
    const latestRuleSet = await this.prisma.auditLog.findFirst({
      where: { action: 'COUNTRY_SERVICE_RULES_UPDATED', entity: 'CountryServiceRules', entityId: countryCode },
      orderBy: { createdAt: 'desc' },
    });

    if (latestRuleSet?.metadata && typeof latestRuleSet.metadata === 'object') {
      const raw = latestRuleSet.metadata as { services?: OperatorServiceRule[] };
      if (Array.isArray(raw.services)) {
        return raw.services;
      }
    }

    // Fall back to country registry definitions
    const countryDef = getCountryDefinition(countryCode);
    if (countryDef?.services?.length) {
      return countryDef.services;
    }
    const qaDef = getCountryDefinition('QA');
    return qaDef?.services ?? [];
  }

  async setCountryServiceRules(actorUserId: string, countryCode: string, services: OperatorServiceRule[]) {
    await this.auditTrailService.write({
      actorUserId,
      action: 'COUNTRY_SERVICE_RULES_UPDATED',
      entity: 'CountryServiceRules',
      entityId: countryCode,
      countryCode,
      metadata: { services } as Record<string, unknown>,
    });

    return { countryCode, services };
  }

  async evaluateServiceCoverage(countryCode: string, serviceType: string, estimatedCostMinor: number) {
    const countryConfig = await this.getCountryConfig(countryCode);
    const rules = await this.getCountryServiceRules(countryCode);
    const serviceRule = rules.find((rule) => rule.serviceType === serviceType);

    const freeCap = serviceType === 'move-in'
      ? countryConfig.freeMoveInCapMinor
      : (serviceRule?.freeCapMinor ?? 0);
    const normalizedEstimated = Math.max(estimatedCostMinor, 0);
    const appliedFreeMinor = Math.min(normalizedEstimated, freeCap);
    const payableMinor = Math.max(normalizedEstimated - appliedFreeMinor, 0);

    return {
      countryCode,
      serviceType,
      estimatedCostMinor: normalizedEstimated,
      appliedFreeMinor,
      payableMinor,
      rule: serviceRule,
    };
  }
}
