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
exports.InsuranceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let InsuranceService = class InsuranceService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    listPlans() {
        return this.prisma.insurancePlan.findMany({ where: { isActive: true }, orderBy: { premiumMinor: 'asc' } });
    }
    async subscribe(userId, dto) {
        const tenantProfile = await this.prisma.tenantProfile.findUniqueOrThrow({ where: { userId } });
        const plan = await this.prisma.insurancePlan.findUniqueOrThrow({ where: { id: dto.planId } });
        return this.prisma.insuranceSubscription.create({
            data: {
                tenantProfileId: tenantProfile.id,
                planId: dto.planId,
                status: 'ACTIVE',
                policyNumber: `QR-POL-${Date.now()}`,
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
                premiumMinor: plan.premiumMinor,
                currency: plan.currency,
            },
            include: { plan: true },
        });
    }
    createClaim(dto) {
        return this.prisma.insuranceClaim.create({
            data: {
                subscriptionId: dto.subscriptionId,
                claimNumber: `QR-CLM-${Date.now()}`,
                incidentDate: new Date(dto.incidentDate),
                amountClaimedMinor: dto.amountClaimedMinor,
                currency: 'QAR',
                description: dto.description,
            },
        });
    }
};
exports.InsuranceService = InsuranceService;
exports.InsuranceService = InsuranceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InsuranceService);
