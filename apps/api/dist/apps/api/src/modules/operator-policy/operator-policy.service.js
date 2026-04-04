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
exports.OperatorPolicyService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_trail_service_1 = require("../audit-trail/audit-trail.service");
let OperatorPolicyService = class OperatorPolicyService {
    prisma;
    configService;
    auditTrailService;
    constructor(prisma, configService, auditTrailService) {
        this.prisma = prisma;
        this.configService = configService;
        this.auditTrailService = auditTrailService;
    }
    defaultRules = {
        QA: [
            { serviceType: 'move-in', enabled: true, category: 'hybrid', basePriceMinor: 50000, freeCapMinor: 50000, requiresVendor: true },
            { serviceType: 'cleaning', enabled: true, category: 'paid', basePriceMinor: 15000, freeCapMinor: 0, requiresVendor: true },
            { serviceType: 'maintenance', enabled: true, category: 'paid', basePriceMinor: 0, freeCapMinor: 0, requiresVendor: true },
            { serviceType: 'viewing-transport', enabled: true, category: 'free', basePriceMinor: 0, freeCapMinor: 0, requiresVendor: true },
        ],
    };
    toJson(value) {
        return JSON.parse(JSON.stringify(value ?? {}));
    }
    getFeatureFlags() {
        return {
            communityEnabled: this.configService.get('COMMUNITY_MODULE_ENABLED') === 'true',
            temporaryStayExchangeEnabled: this.configService.get('TEMP_STAY_EXCHANGE_ENABLED') === 'true',
            miniAirbnbEnabled: this.configService.get('MINI_AIRBNB_ENABLED') === 'true',
        };
    }
    async getCountryConfig(countryCode) {
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
    async upsertCountryConfig(actorUserId, countryCode, payload) {
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
            metadata: payload,
        });
        return updated;
    }
    async getCountryServiceRules(countryCode) {
        const latestRuleSet = await this.prisma.auditLog.findFirst({
            where: { action: 'COUNTRY_SERVICE_RULES_UPDATED', entity: 'CountryServiceRules', entityId: countryCode },
            orderBy: { createdAt: 'desc' },
        });
        if (latestRuleSet?.metadata && typeof latestRuleSet.metadata === 'object') {
            const raw = latestRuleSet.metadata;
            if (Array.isArray(raw.services)) {
                return raw.services;
            }
        }
        return this.defaultRules[countryCode] ?? this.defaultRules.QA ?? [];
    }
    async setCountryServiceRules(actorUserId, countryCode, services) {
        await this.auditTrailService.write({
            actorUserId,
            action: 'COUNTRY_SERVICE_RULES_UPDATED',
            entity: 'CountryServiceRules',
            entityId: countryCode,
            countryCode,
            metadata: { services },
        });
        return { countryCode, services };
    }
    async evaluateServiceCoverage(countryCode, serviceType, estimatedCostMinor) {
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
};
exports.OperatorPolicyService = OperatorPolicyService;
exports.OperatorPolicyService = OperatorPolicyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        audit_trail_service_1.AuditTrailService])
], OperatorPolicyService);
