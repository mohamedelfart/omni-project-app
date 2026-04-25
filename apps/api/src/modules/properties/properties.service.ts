import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto, SearchPropertiesDto, UpdatePropertyDto } from './dto/property.dto';

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  private buildRentModel(input: { finalListingRentMinor: number; baseOwnerRentMinor?: number; existingServiceFeeMinor?: number }) {
    if (input.baseOwnerRentMinor != null) {
      const baseOwnerRentMinor = Math.max(0, input.baseOwnerRentMinor);
      const annualBaseRentMinor = baseOwnerRentMinor * 12;
      const annualPlatformMarginMinor = Math.round(annualBaseRentMinor * 0.1);
      const monthlyPlatformMarginMinor = Math.round(annualPlatformMarginMinor / 12);
      const finalListingRentMinor = baseOwnerRentMinor + monthlyPlatformMarginMinor;

      return {
        baseOwnerRentMinor,
        annualBaseRentMinor,
        annualPlatformMarginMinor,
        monthlyPlatformMarginMinor,
        finalListingRentMinor,
      };
    }

    const monthlyPlatformMarginMinor = Math.max(0, input.existingServiceFeeMinor ?? 0);
    const finalListingRentMinor = Math.max(0, input.finalListingRentMinor);
    const baseOwnerRentMinor = Math.max(0, finalListingRentMinor - monthlyPlatformMarginMinor);

    return {
      baseOwnerRentMinor,
      annualBaseRentMinor: baseOwnerRentMinor * 12,
      annualPlatformMarginMinor: monthlyPlatformMarginMinor * 12,
      monthlyPlatformMarginMinor,
      finalListingRentMinor,
    };
  }

  async create(operatorUserId: string, dto: CreatePropertyDto) {
    const existingContractProfile = await this.prisma.landlordProfile.findFirst({ orderBy: { createdAt: 'asc' } });

    const rentModel = this.buildRentModel({
      finalListingRentMinor: dto.monthlyRentMinor,
      baseOwnerRentMinor: dto.baseOwnerRentMinor,
    });

    const contractProfile = existingContractProfile
      ?? await this.prisma.landlordProfile.create({
        data: {
          userId: operatorUserId,
          companyName: 'QuickRent Operator Asset Contract',
          verificationStatus: 'verified',
        },
      });

    const createdProperty = await this.prisma.property.create({
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
        monthlyRentMinor: rentModel.finalListingRentMinor,
        securityDepositMinor: dto.securityDepositMinor,
        serviceFeeMinor: rentModel.monthlyPlatformMarginMinor,
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

    return {
      ...createdProperty,
      internalRentModel: rentModel,
    };
  }

  async findAll(query: SearchPropertiesDto) {
    const activeHolds = await this.prisma.maintenanceRequest.findMany({
      where: {
        propertyId: { not: null },
        metadata: {
          path: ['maintenanceHold', 'active'],
          equals: true,
        },
      },
      select: { propertyId: true },
      distinct: ['propertyId'],
    });
    const blockedPropertyIds = activeHolds
      .map((row) => row.propertyId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    const where: Prisma.PropertyWhereInput = {
      countryCode: query.countryCode,
      city: query.city,
      bedrooms: query.bedrooms,
      bathrooms: query.bathrooms,
      monthlyRentMinor: query.minPrice || query.maxPrice ? { gte: query.minPrice, lte: query.maxPrice } : undefined,
      status: 'PUBLISHED',
      id: blockedPropertyIds.length > 0 ? { notIn: blockedPropertyIds } : undefined,
    };

    const orderBy = query.sortBy === 'price-asc'
      ? { monthlyRentMinor: 'asc' as const }
      : query.sortBy === 'price-desc'
        ? { monthlyRentMinor: 'desc' as const }
        : { createdAt: 'desc' as const };

    return this.prisma.property.findMany({
      where,
      include: { media: true },
      orderBy,
      take: 50,
    });
  }

  async findOne(propertyId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: { media: true, favorites: true },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return property;
  }

  update(propertyId: string, dto: UpdatePropertyDto) {
    const rentModel = this.buildRentModel({
      finalListingRentMinor: dto.monthlyRentMinor,
      baseOwnerRentMinor: dto.baseOwnerRentMinor,
    });

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
        monthlyRentMinor: rentModel.finalListingRentMinor,
        securityDepositMinor: dto.securityDepositMinor,
        serviceFeeMinor: rentModel.monthlyPlatformMarginMinor,
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

  async toggleFavorite(userId: string, propertyId: string) {
    const favorite = await this.prisma.favorite.findUnique({ where: { userId_propertyId: { userId, propertyId } } });
    if (favorite) {
      await this.prisma.favorite.delete({ where: { id: favorite.id } });
      return { favorited: false };
    }

    await this.prisma.favorite.create({ data: { userId, propertyId } });
    return { favorited: true };
  }

  listFavorites(userId: string) {
    return this.prisma.favorite.findMany({ where: { userId }, include: { property: { include: { media: true } } } });
  }

  private slugify(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }
}