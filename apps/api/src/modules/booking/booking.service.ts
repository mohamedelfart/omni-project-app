import { Injectable } from '@nestjs/common';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { TenantPerksService } from '../notifications/tenant-perks.service';
import { PrismaService } from '../prisma/prisma.service';
import { UnifiedRequestsService } from '../unified-requests/unified-requests.service';
import { CreateBookingRequestDto } from './dto/booking.dto';

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unifiedRequestsService: UnifiedRequestsService,
    private readonly auditTrailService: AuditTrailService,
    private readonly tenantPerksService: TenantPerksService,
  ) {}

  async create(userId: string, dto: CreateBookingRequestDto) {
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

    await this.tenantPerksService.triggerPerk({
      userId,
      trigger: 'BOOKING_CONFIRMED',
      contextEntityId: booking.id,
    });

    return booking;
  }

  list(userId: string) {
    return this.prisma.booking.findMany({ where: { tenantId: userId }, include: { property: true, payments: true, invoice: true } });
  }
}