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
exports.IntegrationHubService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_trail_service_1 = require("../audit-trail/audit-trail.service");
let IntegrationHubService = class IntegrationHubService {
    prisma;
    auditTrailService;
    constructor(prisma, auditTrailService) {
        this.prisma = prisma;
        this.auditTrailService = auditTrailService;
    }
    toJson(value) {
        return JSON.parse(JSON.stringify(value ?? {}));
    }
    async dispatchToProviderAdapter(unifiedRequestId) {
        const request = await this.prisma.unifiedRequest.findUniqueOrThrow({ where: { id: unifiedRequestId } });
        if (!request.vendorId) {
            return { mode: 'core-only', dispatched: false, reason: 'No vendor assigned' };
        }
        const adapter = await this.prisma.adapterConfig.findFirst({
            where: {
                providerId: request.vendorId,
                isActive: true,
                OR: [{ serviceType: request.serviceType }, { serviceType: 'all' }],
            },
            orderBy: { createdAt: 'desc' },
        });
        const routeData = {
            mode: adapter ? 'provider-adapter' : 'core-only',
            adapterId: adapter?.id,
            adapterServiceType: adapter?.serviceType,
            endpoint: adapter?.endpoint,
            dispatchedAt: new Date().toISOString(),
        };
        await this.prisma.unifiedRequest.update({
            where: { id: request.id },
            data: {
                destination: adapter ? 'external-service' : 'provider',
                routeData: this.toJson(routeData),
            },
        });
        await this.prisma.unifiedRequestTrackingEvent.create({
            data: {
                unifiedRequestId: request.id,
                actorType: 'system',
                title: adapter ? 'Integration dispatched' : 'Core dispatch queued',
                description: adapter ? `Adapter ${adapter.id} selected for ${request.serviceType}` : 'No adapter configured, staying in core provider queue.',
                status: 'ASSIGNED',
            },
        });
        await this.auditTrailService.write({
            action: 'UNIFIED_REQUEST_INTEGRATION_ROUTED',
            entity: 'UnifiedRequest',
            entityId: request.id,
            countryCode: request.country,
            metadata: routeData,
        });
        return { dispatched: true, ...routeData };
    }
};
exports.IntegrationHubService = IntegrationHubService;
exports.IntegrationHubService = IntegrationHubService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_trail_service_1.AuditTrailService])
], IntegrationHubService);
