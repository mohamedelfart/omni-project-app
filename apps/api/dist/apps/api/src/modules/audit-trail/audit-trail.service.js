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
exports.AuditTrailService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AuditTrailService = class AuditTrailService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    toJson(value) {
        return JSON.parse(JSON.stringify(value ?? {}));
    }
    write(input) {
        return this.prisma.auditLog.create({
            data: {
                actorUserId: input.actorUserId,
                action: input.action,
                entity: input.entity,
                entityId: input.entityId,
                severity: input.severity ?? 'INFO',
                countryCode: input.countryCode,
                metadata: this.toJson(input.metadata),
            },
        });
    }
    search(query) {
        return this.prisma.auditLog.findMany({
            where: {
                action: query.action,
                entity: query.entity,
                countryCode: query.countryCode,
                severity: query.severity,
                actorUserId: query.actorUserId,
            },
            orderBy: { createdAt: 'desc' },
            take: query.take ?? 100,
        });
    }
};
exports.AuditTrailService = AuditTrailService;
exports.AuditTrailService = AuditTrailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditTrailService);
