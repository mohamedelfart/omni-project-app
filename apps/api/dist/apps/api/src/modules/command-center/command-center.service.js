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
exports.CommandCenterService = void 0;
const common_1 = require("@nestjs/common");
const audit_trail_service_1 = require("../audit-trail/audit-trail.service");
const prisma_service_1 = require("../prisma/prisma.service");
const orchestrator_service_1 = require("../orchestrator/orchestrator.service");
let CommandCenterService = class CommandCenterService {
    prisma;
    orchestratorService;
    auditTrailService;
    constructor(prisma, orchestratorService, auditTrailService) {
        this.prisma = prisma;
        this.orchestratorService = orchestratorService;
        this.auditTrailService = auditTrailService;
    }
    async getDashboard() {
        const [requests, providers, bookings, payments, alerts] = await Promise.all([
            this.prisma.unifiedRequest.count(),
            this.prisma.provider.count({ where: { isActive: true } }),
            this.prisma.booking.count({ where: { status: 'CONFIRMED' } }),
            this.prisma.payment.count({ where: { status: 'FAILED' } }),
            this.prisma.auditLog.count({ where: { severity: { in: ['HIGH', 'CRITICAL'] } } }),
        ]);
        return {
            metrics: {
                liveRequests: requests,
                activeProviders: providers,
                confirmedBookings: bookings,
                paymentExceptions: payments,
                escalationAlerts: alerts,
            },
        };
    }
    listRequests() {
        return this.prisma.unifiedRequest.findMany({ include: { trackingEvents: true }, orderBy: { createdAt: 'desc' } });
    }
    async assignProvider(requestId, providerId) {
        const updated = await this.prisma.unifiedRequest.update({ where: { id: requestId }, data: { vendorId: providerId, status: 'ASSIGNED' } });
        await this.auditTrailService.write({
            action: 'COMMAND_CENTER_PROVIDER_ASSIGNED',
            entity: 'UnifiedRequest',
            entityId: requestId,
            countryCode: updated.country,
            metadata: { providerId },
        });
        return updated;
    }
    async createOffer(userId, payload) {
        const offer = await this.prisma.offer.create({
            data: {
                createdByUserId: userId,
                title: payload.title,
                type: payload.type,
                discountMinor: payload.discountMinor,
                startsAt: new Date(),
                endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
            },
        });
        await this.auditTrailService.write({
            actorUserId: userId,
            action: 'COMMAND_CENTER_OFFER_CREATED',
            entity: 'Offer',
            entityId: offer.id,
            metadata: payload,
        });
        return offer;
    }
    dispatchInstruction(requestId, instructionType, payload) {
        return this.orchestratorService.dispatchInstruction(requestId, instructionType, payload);
    }
    listCountryConfigs() {
        return this.prisma.countryConfig.findMany({ orderBy: { code: 'asc' } });
    }
    listProviders() {
        return this.prisma.provider.findMany({ include: { adapterConfigs: true, providerProfiles: true } });
    }
    listAuditLogs(query) {
        return this.auditTrailService.search({
            action: query?.action,
            entity: query?.entity,
            countryCode: query?.countryCode,
            severity: query?.severity,
            take: 300,
        });
    }
};
exports.CommandCenterService = CommandCenterService;
exports.CommandCenterService = CommandCenterService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        orchestrator_service_1.OrchestratorService,
        audit_trail_service_1.AuditTrailService])
], CommandCenterService);
