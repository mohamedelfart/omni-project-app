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
exports.CommunityService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
let CommunityService = class CommunityService {
    prisma;
    configService;
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    assertEnabled() {
        if (this.configService.get('COMMUNITY_MODULE_ENABLED') !== 'true') {
            throw new common_1.ServiceUnavailableException('Community layer is prebuilt and currently disabled by operator policy');
        }
    }
    listPosts() {
        this.assertEnabled();
        return this.prisma.communityPost.findMany({
            include: { author: true, comments: { include: { author: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    createPost(userId, payload) {
        this.assertEnabled();
        return this.prisma.communityPost.create({
            data: {
                authorId: userId,
                countryCode: 'QA',
                city: 'Doha',
                title: payload.title,
                content: payload.content,
            },
        });
    }
    createComment(userId, payload) {
        this.assertEnabled();
        return this.prisma.communityComment.create({
            data: {
                authorId: userId,
                postId: payload.postId,
                content: payload.content,
            },
        });
    }
    createReport(userId, payload) {
        this.assertEnabled();
        return this.prisma.communityReport.create({
            data: {
                reporterId: userId,
                postId: payload.postId,
                reason: payload.reason,
            },
        });
    }
};
exports.CommunityService = CommunityService;
exports.CommunityService = CommunityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], CommunityService);
