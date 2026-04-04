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
exports.ViewingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const unified_requests_service_1 = require("../unified-requests/unified-requests.service");
const orchestrator_service_1 = require("../orchestrator/orchestrator.service");
let ViewingService = class ViewingService {
    prisma;
    unifiedRequestsService;
    orchestratorService;
    constructor(prisma, unifiedRequestsService, orchestratorService) {
        this.prisma = prisma;
        this.unifiedRequestsService = unifiedRequestsService;
        this.orchestratorService = orchestratorService;
    }
    async getOrCreateShortlist(userId) {
        const shortlist = await this.prisma.shortlist.findFirst({
            where: { userId, isActive: true },
            include: { items: { include: { property: { include: { media: true } } }, orderBy: { position: 'asc' } } },
        });
        if (shortlist) {
            return shortlist;
        }
        return this.prisma.shortlist.create({
            data: { userId },
            include: { items: { include: { property: { include: { media: true } } }, orderBy: { position: 'asc' } } },
        });
    }
    async addToShortlist(userId, propertyId) {
        const shortlist = await this.getOrCreateShortlist(userId);
        const existingItem = shortlist.items.find((item) => item.propertyId === propertyId);
        if (existingItem) {
            return existingItem;
        }
        if (shortlist.items.length >= 3) {
            throw new common_1.BadRequestException('Shortlist can contain at most 3 properties');
        }
        return this.prisma.shortlistItem.create({
            data: {
                shortlistId: shortlist.id,
                propertyId,
                position: shortlist.items.length + 1,
            },
            include: { property: true },
        });
    }
    async compare(userId) {
        const shortlist = await this.getOrCreateShortlist(userId);
        return shortlist.items.map((item) => ({
            propertyId: item.property.id,
            title: item.property.title,
            rent: item.property.monthlyRentMinor,
            bedrooms: item.property.bedrooms,
            bathrooms: item.property.bathrooms,
            areaSqm: item.property.areaSqm,
        }));
    }
    async createViewingRequest(userId, payload) {
        const shortlist = await this.getOrCreateShortlist(userId);
        if (!shortlist.items.length || shortlist.items.length > 3) {
            throw new common_1.BadRequestException('Viewing request requires 1 to 3 shortlisted properties');
        }
        const unifiedRequest = await this.unifiedRequestsService.create(userId, {
            requestType: 'property-viewing',
            serviceType: 'viewing-transport',
            country: 'QA',
            city: shortlist.items[0]?.property.city ?? 'Doha',
            propertyIds: shortlist.items.map((item) => item.propertyId),
            preferredTime: payload.preferredDateISO,
            pickupLat: payload.pickupLat,
            pickupLng: payload.pickupLng,
            metadata: { notes: payload.notes },
        });
        const viewingRequest = await this.prisma.viewingRequest.create({
            data: {
                unifiedRequestId: unifiedRequest.id,
                tenantId: userId,
                shortlistId: shortlist.id,
                preferredDate: new Date(payload.preferredDateISO),
                pickupLat: payload.pickupLat,
                pickupLng: payload.pickupLng,
                pickupAddress: 'Tenant live location',
                selectedPropertyIds: shortlist.items.map((item) => item.propertyId),
                notes: payload.notes,
                items: {
                    create: shortlist.items.map((item) => ({ propertyId: item.propertyId, stopOrder: item.position })),
                },
            },
            include: { items: { include: { property: true } } },
        });
        const provider = await this.orchestratorService.selectProvider('viewing-transport', 'QA');
        if (provider) {
            await this.prisma.viewingTripAssignment.create({
                data: {
                    viewingRequestId: viewingRequest.id,
                    providerId: provider.id,
                    status: 'ASSIGNED',
                    etaMinutes: 12,
                },
            });
        }
        return this.prisma.viewingRequest.findUniqueOrThrow({
            where: { id: viewingRequest.id },
            include: { items: { include: { property: true } }, assignment: true, unifiedRequest: true },
        });
    }
    listViewingRequests() {
        return this.prisma.viewingRequest.findMany({
            include: { items: { include: { property: true } }, assignment: true, unifiedRequest: true },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.ViewingService = ViewingService;
exports.ViewingService = ViewingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        unified_requests_service_1.UnifiedRequestsService,
        orchestrator_service_1.OrchestratorService])
], ViewingService);
