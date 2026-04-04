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
exports.UnifiedRequestsService = void 0;
const common_1 = require("@nestjs/common");
const audit_trail_service_1 = require("../audit-trail/audit-trail.service");
const prisma_service_1 = require("../prisma/prisma.service");
const orchestrator_service_1 = require("../orchestrator/orchestrator.service");
let UnifiedRequestsService = class UnifiedRequestsService {
    prisma;
    orchestratorService;
    auditTrailService;
    constructor(prisma, orchestratorService, auditTrailService) {
        this.prisma = prisma;
        this.orchestratorService = orchestratorService;
        this.auditTrailService = auditTrailService;
    }
    toJson(value) {
        return JSON.parse(JSON.stringify(value ?? {}));
    }
    async create(userId, dto) {
        const unifiedRequest = await this.prisma.unifiedRequest.create({
            data: {
                userId,
                tenantId: userId,
                requestType: dto.requestType,
                serviceType: dto.serviceType,
                source: 'tenant-app',
                destination: 'core',
                country: dto.country,
                city: dto.city,
                propertyIds: dto.propertyIds ?? [],
                preferredTime: dto.preferredTime ? new Date(dto.preferredTime) : undefined,
                locationLabel: dto.locationLabel,
                currentLat: dto.currentLat,
                currentLng: dto.currentLng,
                targetLat: dto.targetLat,
                targetLng: dto.targetLng,
                pickupLat: dto.pickupLat,
                pickupLng: dto.pickupLng,
                dropoffLat: dto.dropoffLat,
                dropoffLng: dto.dropoffLng,
                metadata: this.toJson(dto.metadata),
                trackingEvents: {
                    create: [{ actorType: 'tenant', title: 'Request submitted', status: 'SUBMITTED' }],
                },
            },
            include: { trackingEvents: true },
        });
        const routing = await this.orchestratorService.routeRequest(unifiedRequest.id);
        await this.auditTrailService.write({
            actorUserId: userId,
            action: 'UNIFIED_REQUEST_CREATED',
            entity: 'UnifiedRequest',
            entityId: unifiedRequest.id,
            countryCode: unifiedRequest.country,
            metadata: {
                requestType: unifiedRequest.requestType,
                serviceType: unifiedRequest.serviceType,
                source: unifiedRequest.source,
                destination: unifiedRequest.destination,
                routing,
            },
        });
        return { ...unifiedRequest, routing };
    }
    listAll() {
        return this.prisma.unifiedRequest.findMany({ include: { trackingEvents: true }, orderBy: { createdAt: 'desc' } });
    }
    getById(requestId) {
        return this.prisma.unifiedRequest.findUniqueOrThrow({ where: { id: requestId }, include: { trackingEvents: true } });
    }
    dispatchInstruction(requestId, dto) {
        void this.auditTrailService.write({
            action: 'UNIFIED_REQUEST_INSTRUCTION_RECEIVED',
            entity: 'UnifiedRequest',
            entityId: requestId,
            metadata: {
                instructionType: dto.instructionType,
            },
        });
        return this.orchestratorService.dispatchInstruction(requestId, dto.instructionType, dto.payload);
    }
};
exports.UnifiedRequestsService = UnifiedRequestsService;
exports.UnifiedRequestsService = UnifiedRequestsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        orchestrator_service_1.OrchestratorService,
        audit_trail_service_1.AuditTrailService])
], UnifiedRequestsService);
