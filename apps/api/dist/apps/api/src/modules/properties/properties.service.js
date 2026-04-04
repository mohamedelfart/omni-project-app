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
exports.PropertiesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PropertiesService = class PropertiesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(operatorUserId, dto) {
        const existingContractProfile = await this.prisma.landlordProfile.findFirst({ orderBy: { createdAt: 'asc' } });
        const contractProfile = existingContractProfile
            ?? await this.prisma.landlordProfile.create({
                data: {
                    userId: operatorUserId,
                    companyName: 'QuickRent Operator Asset Contract',
                    verificationStatus: 'verified',
                },
            });
        return this.prisma.property.create({
            data: {
                landlordProfileId: contractProfile.id,
                ownerUserId: contractProfile.userId,
                slug: this.slugify(dto.title),
                title: dto.title,
                description: dto.description,
                countryCode: dto.countryCode,
                city: dto.city,
                district: dto.district,
                propertyType: dto.propertyType,
                addressLine1: dto.addressLine1,
                lat: dto.lat,
                lng: dto.lng,
                monthlyRentMinor: dto.monthlyRentMinor,
                securityDepositMinor: dto.securityDepositMinor,
                currency: dto.currency,
                bedrooms: dto.bedrooms,
                bathrooms: dto.bathrooms,
                areaSqm: dto.areaSqm,
                furnished: dto.furnished ?? false,
                petFriendly: dto.petFriendly ?? false,
                amenities: dto.amenities ?? [],
                status: 'PUBLISHED',
                media: dto.media?.length
                    ? { create: dto.media.map((item) => ({ mediaType: item.mediaType, url: item.url })) }
                    : undefined,
            },
            include: { media: true },
        });
    }
    findAll(query) {
        const where = {
            countryCode: query.countryCode,
            city: query.city,
            bedrooms: query.bedrooms,
            bathrooms: query.bathrooms,
            monthlyRentMinor: query.minPrice || query.maxPrice ? { gte: query.minPrice, lte: query.maxPrice } : undefined,
            status: 'PUBLISHED',
        };
        const orderBy = query.sortBy === 'price-asc'
            ? { monthlyRentMinor: 'asc' }
            : query.sortBy === 'price-desc'
                ? { monthlyRentMinor: 'desc' }
                : { createdAt: 'desc' };
        return this.prisma.property.findMany({
            where,
            include: { media: true },
            orderBy,
            take: 50,
        });
    }
    async findOne(propertyId) {
        const property = await this.prisma.property.findUnique({
            where: { id: propertyId },
            include: { media: true, favorites: true },
        });
        if (!property) {
            throw new common_1.NotFoundException('Property not found');
        }
        return property;
    }
    update(propertyId, dto) {
        return this.prisma.property.update({
            where: { id: propertyId },
            data: {
                title: dto.title,
                description: dto.description,
                countryCode: dto.countryCode,
                city: dto.city,
                district: dto.district,
                propertyType: dto.propertyType,
                addressLine1: dto.addressLine1,
                lat: dto.lat,
                lng: dto.lng,
                monthlyRentMinor: dto.monthlyRentMinor,
                securityDepositMinor: dto.securityDepositMinor,
                currency: dto.currency,
                bedrooms: dto.bedrooms,
                bathrooms: dto.bathrooms,
                areaSqm: dto.areaSqm,
                furnished: dto.furnished,
                petFriendly: dto.petFriendly,
                amenities: dto.amenities,
            },
        });
    }
    async toggleFavorite(userId, propertyId) {
        const favorite = await this.prisma.favorite.findUnique({ where: { userId_propertyId: { userId, propertyId } } });
        if (favorite) {
            await this.prisma.favorite.delete({ where: { id: favorite.id } });
            return { favorited: false };
        }
        await this.prisma.favorite.create({ data: { userId, propertyId } });
        return { favorited: true };
    }
    listFavorites(userId) {
        return this.prisma.favorite.findMany({ where: { userId }, include: { property: { include: { media: true } } } });
    }
    slugify(value) {
        return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }
};
exports.PropertiesService = PropertiesService;
exports.PropertiesService = PropertiesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PropertiesService);
