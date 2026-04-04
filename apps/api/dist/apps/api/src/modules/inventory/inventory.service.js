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
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let InventoryService = class InventoryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOverview() {
        const [assets, orders, tickets, financialRecords] = await Promise.all([
            this.prisma.property.count(),
            this.prisma.booking.count(),
            this.prisma.unifiedRequest.count(),
            this.prisma.payment.count(),
        ]);
        return {
            assets,
            orders,
            tickets,
            financialRecords,
        };
    }
    listAssets(query) {
        return this.prisma.property.findMany({
            where: {
                status: query.status,
                city: query.city,
                countryCode: query.countryCode,
            },
            include: { media: true },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
    }
    listOrders(query) {
        return this.prisma.booking.findMany({
            where: { status: query.status },
            include: { property: true, tenant: true, payments: true, invoice: true },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
    }
    listTickets(query) {
        return this.prisma.unifiedRequest.findMany({
            where: {
                status: query.status,
                serviceType: query.serviceType,
                country: query.country,
            },
            include: { trackingEvents: true },
            orderBy: { createdAt: 'desc' },
            take: 300,
        });
    }
    listFinancialRecords(query) {
        return this.prisma.payment.findMany({
            where: { status: query.status },
            include: { user: true, booking: true, invoice: true },
            orderBy: { createdAt: 'desc' },
            take: 300,
        });
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryService);
