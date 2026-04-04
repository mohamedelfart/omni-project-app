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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const audit_trail_service_1 = require("../audit-trail/audit-trail.service");
const prisma_service_1 = require("../prisma/prisma.service");
let PaymentsService = class PaymentsService {
    prisma;
    auditTrailService;
    constructor(prisma, auditTrailService) {
        this.prisma = prisma;
        this.auditTrailService = auditTrailService;
    }
    async create(userId, dto) {
        const payment = await this.prisma.payment.create({
            data: {
                userId,
                bookingId: dto.bookingId,
                unifiedRequestId: dto.unifiedRequestId,
                amountMinor: dto.amountMinor,
                currency: dto.currency,
                provider: dto.provider,
                providerRef: `pay_${Date.now()}`,
            },
        });
        const invoice = await this.prisma.invoice.create({
            data: {
                bookingId: dto.bookingId,
                paymentId: payment.id,
                invoiceNumber: `INV-${Date.now()}`,
                subtotalMinor: dto.amountMinor,
                taxMinor: 0,
                totalMinor: dto.amountMinor,
                currency: dto.currency,
                dueDate: new Date(),
            },
        });
        await this.auditTrailService.write({
            actorUserId: userId,
            action: 'PAYMENT_CREATED',
            entity: 'Payment',
            entityId: payment.id,
            metadata: {
                bookingId: dto.bookingId,
                unifiedRequestId: dto.unifiedRequestId,
                amountMinor: dto.amountMinor,
                currency: dto.currency,
            },
        });
        return { payment, invoice };
    }
    async updateStatus(paymentId, dto) {
        const payment = await this.prisma.payment.update({
            where: { id: paymentId },
            data: { status: dto.status },
        });
        if (payment.bookingId && dto.status === 'SUCCEEDED') {
            await this.prisma.booking.update({ where: { id: payment.bookingId }, data: { status: 'CONFIRMED', confirmedAt: new Date() } });
        }
        if (dto.status === 'SUCCEEDED') {
            await this.prisma.invoice.updateMany({
                where: { paymentId },
                data: { status: 'PAID', paidAt: new Date() },
            });
        }
        await this.auditTrailService.write({
            action: 'PAYMENT_STATUS_UPDATED',
            entity: 'Payment',
            entityId: payment.id,
            metadata: {
                status: dto.status,
            },
        });
        return payment;
    }
    listInvoices(userId) {
        return this.prisma.payment.findMany({ where: { userId }, include: { invoice: true, booking: true } });
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_trail_service_1.AuditTrailService])
], PaymentsService);
