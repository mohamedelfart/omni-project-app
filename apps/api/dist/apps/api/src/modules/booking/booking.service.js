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
exports.BookingService = void 0;
const common_1 = require("@nestjs/common");
const audit_trail_service_1 = require("../audit-trail/audit-trail.service");
const prisma_service_1 = require("../prisma/prisma.service");
const unified_requests_service_1 = require("../unified-requests/unified-requests.service");
let BookingService = class BookingService {
    prisma;
    unifiedRequestsService;
    auditTrailService;
    constructor(prisma, unifiedRequestsService, auditTrailService) {
        this.prisma = prisma;
        this.unifiedRequestsService = unifiedRequestsService;
        this.auditTrailService = auditTrailService;
    }
    async create(userId, dto) {
        const property = await this.prisma.property.findUniqueOrThrow({ where: { id: dto.propertyId } });
        const unifiedRequest = await this.unifiedRequestsService.create(userId, {
            requestType: 'property-booking',
            serviceType: 'viewing-transport',
            country: property.countryCode,
            city: property.city,
            propertyIds: [property.id],
            metadata: { offerId: dto.offerId },
        });
        const booking = await this.prisma.booking.create({
            data: {
                unifiedRequestId: unifiedRequest.id,
                tenantId: userId,
                propertyId: property.id,
                offerId: dto.offerId,
                moveInDate: new Date(dto.moveInDateISO),
                termMonths: dto.termMonths,
                totalAmountMinor: property.monthlyRentMinor * dto.termMonths,
                securityDepositMinor: property.securityDepositMinor,
                currency: property.currency,
            },
            include: { property: true, unifiedRequest: true },
        });
        await this.auditTrailService.write({
            actorUserId: userId,
            action: 'BOOKING_CREATED',
            entity: 'Booking',
            entityId: booking.id,
            countryCode: property.countryCode,
            metadata: {
                propertyId: property.id,
                termMonths: dto.termMonths,
                totalAmountMinor: booking.totalAmountMinor,
            },
        });
        return booking;
    }
    list(userId) {
        return this.prisma.booking.findMany({ where: { tenantId: userId }, include: { property: true, payments: true, invoice: true } });
    }
};
exports.BookingService = BookingService;
exports.BookingService = BookingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        unified_requests_service_1.UnifiedRequestsService,
        audit_trail_service_1.AuditTrailService])
], BookingService);
