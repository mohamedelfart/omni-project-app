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
exports.OrchestratorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_trail_service_1 = require("../audit-trail/audit-trail.service");
const integration_hub_service_1 = require("../integration-hub/integration-hub.service");
let OrchestratorService = class OrchestratorService {
    prisma;
    integrationHubService;
    auditTrailService;
    constructor(prisma, integrationHubService, auditTrailService) {
        this.prisma = prisma;
        this.integrationHubService = integrationHubService;
        this.auditTrailService = auditTrailService;
    }
    toJson(value) {
        return JSON.parse(JSON.stringify(value ?? {}));
    }
    toDistanceScore(fromLat, fromLng, toLat, toLng) {
        if (fromLat == null ||
            fromLng == null ||
            toLat == null ||
            toLng == null) {
            return Number.MAX_SAFE_INTEGER;
        }
        const dLat = fromLat - toLat;
        const dLng = fromLng - toLng;
        return Math.sqrt((dLat * dLat) + (dLng * dLng));
    }
    async selectProvider(serviceType, countryCode, city, pickupLat, pickupLng) {
        const candidates = await this.prisma.provider.findMany({
            where: {
                countryCode,
                isActive: true,
                serviceTypes: { has: serviceType },
                providerProfiles: {
                    some: {
                        availabilityStatus: { in: ['online', 'available'] },
                    },
                },
            },
            include: {
                providerProfiles: {
                    where: { availabilityStatus: { in: ['online', 'available'] } },
                    orderBy: { updatedAt: 'desc' },
                    take: 1,
                },
            },
        });
        const ranked = candidates
            .map((provider) => {
            const profile = provider.providerProfiles[0];
            return {
                provider,
                distanceScore: this.toDistanceScore(profile?.currentLat, profile?.currentLng, pickupLat, pickupLng),
                cityScore: city && provider.city && city.toLowerCase() === provider.city.toLowerCase() ? 0 : 1,
            };
        })
            .sort((a, b) => {
            if (a.cityScore !== b.cityScore) {
                return a.cityScore - b.cityScore;
            }
            if (a.distanceScore !== b.distanceScore) {
                return a.distanceScore - b.distanceScore;
            }
            if (a.provider.isFallbackEnabled !== b.provider.isFallbackEnabled) {
                return Number(a.provider.isFallbackEnabled) - Number(b.provider.isFallbackEnabled);
            }
            return b.provider.ratingAverage - a.provider.ratingAverage;
        });
        if (ranked.length > 0) {
            return ranked[0]?.provider;
        }
        return this.prisma.provider.findFirst({
            where: {
                countryCode,
                isActive: true,
                serviceTypes: { has: serviceType },
            },
            orderBy: [{ isFallbackEnabled: 'asc' }, { ratingAverage: 'desc' }],
        });
    }
    async routeRequest(unifiedRequestId) {
        const unifiedRequest = await this.prisma.unifiedRequest.findUniqueOrThrow({ where: { id: unifiedRequestId } });
        const provider = unifiedRequest.vendorId
            ? await this.prisma.provider.findUnique({ where: { id: unifiedRequest.vendorId } })
            : await this.selectProvider(unifiedRequest.serviceType, unifiedRequest.country, unifiedRequest.city, unifiedRequest.pickupLat, unifiedRequest.pickupLng);
        if (provider && !unifiedRequest.vendorId) {
            await this.prisma.unifiedRequest.update({ where: { id: unifiedRequest.id }, data: { vendorId: provider.id, status: 'ASSIGNED' } });
        }
        await this.prisma.unifiedRequestTrackingEvent.createMany({
            data: [
                {
                    unifiedRequestId,
                    actorType: 'system',
                    title: 'Command center notified',
                    status: 'SUBMITTED',
                    description: 'Unified request mirrored to command center queue.',
                },
                {
                    unifiedRequestId,
                    actorType: provider ? 'system' : 'command-center',
                    title: provider ? 'Provider dispatched' : 'Awaiting provider assignment',
                    status: provider ? 'ASSIGNED' : 'UNDER_REVIEW',
                    description: provider ? `Provider ${provider.name} selected by orchestrator.` : 'Manual assignment required.',
                },
            ],
        });
        const integration = await this.integrationHubService.dispatchToProviderAdapter(unifiedRequestId);
        await this.auditTrailService.write({
            action: 'UNIFIED_REQUEST_ROUTED',
            entity: 'UnifiedRequest',
            entityId: unifiedRequestId,
            countryCode: unifiedRequest.country,
            metadata: {
                routedToCommandCenter: true,
                routedToProvider: Boolean(provider),
                providerId: provider?.id,
                integration,
            },
        });
        return {
            routedToCommandCenter: true,
            routedToProvider: Boolean(provider),
            provider,
            integration,
        };
    }
    async dispatchInstruction(requestId, instructionType, payload) {
        const status = instructionType === 'reject' ? 'REJECTED' : instructionType === 'update-status' && payload?.status ? String(payload.status).toUpperCase() : 'UNDER_REVIEW';
        await this.prisma.unifiedRequest.update({
            where: { id: requestId },
            data: {
                status: status,
                metadata: this.toJson({ commandInstruction: instructionType, payload }),
            },
        });
        await this.prisma.unifiedRequestTrackingEvent.create({
            data: {
                unifiedRequestId: requestId,
                actorType: 'command-center',
                title: `Instruction: ${instructionType}`,
                status: status,
                metadata: this.toJson(payload),
            },
        });
        await this.auditTrailService.write({
            action: 'COMMAND_INSTRUCTION_DISPATCHED',
            entity: 'UnifiedRequest',
            entityId: requestId,
            metadata: {
                instructionType,
                payload,
                status,
            },
        });
        return { requestId, instructionType, dispatched: true };
    }
};
exports.OrchestratorService = OrchestratorService;
exports.OrchestratorService = OrchestratorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        integration_hub_service_1.IntegrationHubService,
        audit_trail_service_1.AuditTrailService])
], OrchestratorService);
