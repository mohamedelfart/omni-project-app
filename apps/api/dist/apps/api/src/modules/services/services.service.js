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
exports.ServicesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const operator_policy_service_1 = require("../operator-policy/operator-policy.service");
const unified_requests_service_1 = require("../unified-requests/unified-requests.service");
let ServicesService = class ServicesService {
    prisma;
    unifiedRequestsService;
    operatorPolicyService;
    constructor(prisma, unifiedRequestsService, operatorPolicyService) {
        this.prisma = prisma;
        this.unifiedRequestsService = unifiedRequestsService;
        this.operatorPolicyService = operatorPolicyService;
    }
    async createMoveIn(userId, dto) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        const countryCode = user.countryCode ?? 'QA';
        const costEvaluation = await this.operatorPolicyService.evaluateServiceCoverage(countryCode, 'move-in', dto.estimatedCostMinor ?? 0);
        const unifiedRequest = await this.unifiedRequestsService.create(userId, {
            requestType: 'move-in',
            serviceType: 'move-in',
            country: countryCode,
            city: user.countryCode === 'QA' ? 'Doha' : (user.countryCode ?? 'Doha'),
            metadata: {
                ...JSON.parse(JSON.stringify(dto)),
                costEvaluation,
            },
        });
        if (costEvaluation.payableMinor > 0) {
            await this.prisma.unifiedRequest.update({
                where: { id: unifiedRequest.id },
                data: {
                    status: 'AWAITING_PAYMENT',
                    paymentStatus: 'PENDING',
                },
            });
            await this.prisma.payment.create({
                data: {
                    unifiedRequestId: unifiedRequest.id,
                    userId,
                    amountMinor: costEvaluation.payableMinor,
                    currency: countryCode === 'QA' ? 'QAR' : 'USD',
                    provider: 'internal-service-wallet',
                    providerRef: `svc_${Date.now()}`,
                    status: 'PENDING',
                    metadata: {
                        serviceType: 'move-in',
                        freeCoverageMinor: costEvaluation.appliedFreeMinor,
                        estimatedCostMinor: costEvaluation.estimatedCostMinor,
                    },
                },
            });
        }
        return this.prisma.movingRequest.create({
            data: {
                unifiedRequestId: unifiedRequest.id,
                tenantProfileId: (await this.prisma.tenantProfile.findUniqueOrThrow({ where: { userId } })).id,
                moveDate: new Date(dto.moveDate),
                pickupAddress: dto.pickupAddress,
                dropoffAddress: dto.dropoffAddress,
                estimatedCostMinor: dto.estimatedCostMinor,
                freeCoverageMinor: costEvaluation.appliedFreeMinor,
            },
            include: { unifiedRequest: true },
        });
    }
    async createMaintenance(userId, dto) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        const unifiedRequest = await this.unifiedRequestsService.create(userId, {
            requestType: 'maintenance',
            serviceType: 'maintenance',
            country: user.countryCode ?? 'QA',
            city: user.countryCode === 'QA' ? 'Doha' : (user.countryCode ?? 'Doha'),
            metadata: JSON.parse(JSON.stringify(dto)),
        });
        return this.prisma.maintenanceRequest.create({
            data: {
                unifiedRequestId: unifiedRequest.id,
                tenantProfileId: (await this.prisma.tenantProfile.findUniqueOrThrow({ where: { userId } })).id,
                category: dto.category,
                severity: dto.severity,
                preferredVisitAt: dto.preferredVisitAt ? new Date(dto.preferredVisitAt) : undefined,
            },
        });
    }
    async createCleaning(userId, dto) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        const unifiedRequest = await this.unifiedRequestsService.create(userId, {
            requestType: 'cleaning',
            serviceType: 'cleaning',
            country: user.countryCode ?? 'QA',
            city: user.countryCode === 'QA' ? 'Doha' : (user.countryCode ?? 'Doha'),
            metadata: JSON.parse(JSON.stringify(dto)),
        });
        return this.prisma.cleaningRequest.create({
            data: {
                unifiedRequestId: unifiedRequest.id,
                tenantProfileId: (await this.prisma.tenantProfile.findUniqueOrThrow({ where: { userId } })).id,
                serviceDate: new Date(dto.serviceDate),
                durationHours: dto.durationHours,
                isMonthlyIncluded: true,
            },
        });
    }
    async createAirportTransfer(userId, dto) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        const unifiedRequest = await this.unifiedRequestsService.create(userId, {
            requestType: 'airport-transfer',
            serviceType: 'airport-transfer',
            country: user.countryCode ?? 'QA',
            city: user.countryCode === 'QA' ? 'Doha' : (user.countryCode ?? 'Doha'),
            pickupLat: dto.pickupLat,
            pickupLng: dto.pickupLng,
            dropoffLat: dto.dropoffLat,
            dropoffLng: dto.dropoffLng,
            metadata: JSON.parse(JSON.stringify(dto)),
        });
        return this.prisma.airportTransferRequest.create({
            data: {
                unifiedRequestId: unifiedRequest.id,
                tenantProfileId: (await this.prisma.tenantProfile.findUniqueOrThrow({ where: { userId } })).id,
                pickupAt: new Date(dto.pickupAt),
                pickupLat: dto.pickupLat,
                pickupLng: dto.pickupLng,
                dropoffLat: dto.dropoffLat,
                dropoffLng: dto.dropoffLng,
                flightNumber: dto.flightNumber,
            },
        });
    }
    createPaidService(userId, dto) {
        return this.prisma.user.findUniqueOrThrow({ where: { id: userId } }).then((user) => this.unifiedRequestsService.create(userId, {
            requestType: dto.requestType,
            serviceType: dto.serviceType,
            country: user.countryCode ?? 'QA',
            city: dto.city,
            metadata: { integrationMode: 'provider-adapter', requestedBy: 'tenant-app' },
        }));
    }
};
exports.ServicesService = ServicesService;
exports.ServicesService = ServicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        unified_requests_service_1.UnifiedRequestsService,
        operator_policy_service_1.OperatorPolicyService])
], ServicesService);
