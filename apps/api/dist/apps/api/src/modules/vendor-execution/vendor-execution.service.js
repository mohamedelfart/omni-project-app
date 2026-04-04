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
exports.VendorExecutionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_trail_service_1 = require("../audit-trail/audit-trail.service");
let VendorExecutionService = class VendorExecutionService {
    prisma;
    auditTrailService;
    constructor(prisma, auditTrailService) {
        this.prisma = prisma;
        this.auditTrailService = auditTrailService;
    }
    async providerIdsForUser(userId) {
        const profiles = await this.prisma.providerProfile.findMany({
            where: { userId },
            select: { providerId: true },
        });
        return profiles.map((profile) => profile.providerId);
    }
    async listMyTickets(userId) {
        const providerIds = await this.providerIdsForUser(userId);
        if (!providerIds.length) {
            return [];
        }
        const requests = await this.prisma.unifiedRequest.findMany({
            where: { vendorId: { in: providerIds } },
            include: {
                user: { select: { fullName: true, phoneNumber: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
        return requests.map((request) => ({
            ticketId: request.id,
            userName: request.user.fullName,
            phone: request.user.phoneNumber,
            location: {
                label: request.locationLabel,
                currentLat: request.currentLat,
                currentLng: request.currentLng,
                pickupLat: request.pickupLat,
                pickupLng: request.pickupLng,
                dropoffLat: request.dropoffLat,
                dropoffLng: request.dropoffLng,
            },
            assetId: request.propertyIds[0] ?? null,
            serviceType: request.serviceType,
            status: request.status,
            country: request.country,
            city: request.city,
            preferredTime: request.preferredTime,
        }));
    }
    async updateTicketStatus(userId, ticketId, status, note) {
        const providerIds = await this.providerIdsForUser(userId);
        if (!providerIds.length) {
            throw new common_1.ForbiddenException('No provider profile attached to current user');
        }
        const ticket = await this.prisma.unifiedRequest.findUnique({ where: { id: ticketId } });
        if (!ticket) {
            throw new common_1.NotFoundException('Ticket not found');
        }
        if (!ticket.vendorId || !providerIds.includes(ticket.vendorId)) {
            throw new common_1.ForbiddenException('Ticket is not assigned to your provider account');
        }
        const updated = await this.prisma.unifiedRequest.update({
            where: { id: ticket.id },
            data: { status: status.toUpperCase() },
        });
        await this.prisma.unifiedRequestTrackingEvent.create({
            data: {
                unifiedRequestId: ticket.id,
                actorUserId: userId,
                actorType: 'provider',
                title: 'Vendor status update',
                description: note,
                status: status.toUpperCase(),
            },
        });
        await this.auditTrailService.write({
            actorUserId: userId,
            action: 'VENDOR_TICKET_STATUS_UPDATED',
            entity: 'UnifiedRequest',
            entityId: ticket.id,
            countryCode: ticket.country,
            metadata: { status: status.toUpperCase(), note },
        });
        return updated;
    }
};
exports.VendorExecutionService = VendorExecutionService;
exports.VendorExecutionService = VendorExecutionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_trail_service_1.AuditTrailService])
], VendorExecutionService);
