import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, Property, PropertyStatus } from '@prisma/client';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { PrismaService } from '../prisma/prisma.service';

/** Booking rows in these states still hold inventory on the property. */
const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.DRAFT,
  BookingStatus.RESERVED,
  BookingStatus.CONFIRMED,
  BookingStatus.CONTRACT_PENDING,
  BookingStatus.ACTIVE,
];

export type PropertyReserveResult = {
  property: Property;
};

export type PropertyReleaseResult = {
  property: Property;
  /** True when property was already PUBLISHED (no DB write). */
  idempotent: boolean;
};

@Injectable()
export class PropertyCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditTrailService: AuditTrailService,
  ) {}

  /**
   * Command: reserve property for operational hold (command-center).
   * Transitions PUBLISHED → RESERVED. Tenant catalog (`findAll`) only lists PUBLISHED, so RESERVED hides from discovery.
   */
  async reserveProperty(actorUserId: string, propertyId: string): Promise<PropertyReserveResult> {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      throw new NotFoundException({ code: 'PROPERTY_NOT_FOUND', message: `Property ${propertyId} not found` });
    }

    this.assertReserveAllowed(property);

    const activeBooking = await this.prisma.booking.findFirst({
      where: {
        propertyId,
        status: { in: ACTIVE_BOOKING_STATUSES },
      },
    });
    if (activeBooking) {
      throw new ConflictException({
        code: 'ACTIVE_BOOKING_CONFLICT',
        message: 'Cannot reserve: property has an active booking.',
        bookingId: activeBooking.id,
        bookingStatus: activeBooking.status,
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.property.findUnique({ where: { id: propertyId } });
      if (!row) {
        throw new NotFoundException({ code: 'PROPERTY_NOT_FOUND', message: `Property ${propertyId} not found` });
      }
      this.assertReserveAllowed(row);

      const booking = await tx.booking.findFirst({
        where: {
          propertyId,
          status: { in: ACTIVE_BOOKING_STATUSES },
        },
      });
      if (booking) {
        throw new ConflictException({
          code: 'ACTIVE_BOOKING_CONFLICT',
          message: 'Cannot reserve: property has an active booking.',
          bookingId: booking.id,
          bookingStatus: booking.status,
        });
      }

      const result = await tx.property.updateMany({
        where: { id: propertyId, status: PropertyStatus.PUBLISHED },
        data: { status: PropertyStatus.RESERVED },
      });
      if (result.count !== 1) {
        throw new ConflictException({
          code: 'RESERVE_CONFLICT',
          message: 'Reserve failed: property is no longer PUBLISHED (concurrent change or invalid state).',
        });
      }
      return tx.property.findUniqueOrThrow({ where: { id: propertyId } });
    });

    await this.auditTrailService.write({
      actorUserId,
      action: 'PROPERTY_RESERVED',
      entity: 'Property',
      entityId: propertyId,
      countryCode: updated.countryCode,
      metadata: {
        previousStatus: property.status,
        nextStatus: updated.status,
      },
    });

    return { property: updated };
  }

  /**
   * Command: release command-center reservation.
   * RESERVED → PUBLISHED. Idempotent if already PUBLISHED.
   */
  async releaseReservation(actorUserId: string, propertyId: string): Promise<PropertyReleaseResult> {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      throw new NotFoundException({ code: 'PROPERTY_NOT_FOUND', message: `Property ${propertyId} not found` });
    }

    if (property.status === PropertyStatus.PUBLISHED) {
      return { property, idempotent: true };
    }

    if (property.status !== PropertyStatus.RESERVED) {
      throw new BadRequestException({
        code: 'INVALID_STATE_FOR_RELEASE',
        message: `Cannot release reservation: property status is ${property.status}, expected RESERVED.`,
      });
    }

    const { updated, transitioned } = await this.prisma.$transaction(async (tx) => {
      const row = await tx.property.findUnique({ where: { id: propertyId } });
      if (!row) {
        throw new NotFoundException({ code: 'PROPERTY_NOT_FOUND', message: `Property ${propertyId} not found` });
      }
      if (row.status === PropertyStatus.PUBLISHED) {
        return { updated: row, transitioned: false };
      }
      if (row.status !== PropertyStatus.RESERVED) {
        throw new BadRequestException({
          code: 'INVALID_STATE_FOR_RELEASE',
          message: `Cannot release reservation: property status is ${row.status}, expected RESERVED.`,
        });
      }

      const result = await tx.property.updateMany({
        where: { id: propertyId, status: PropertyStatus.RESERVED },
        data: { status: PropertyStatus.PUBLISHED },
      });
      if (result.count !== 1) {
        const again = await tx.property.findUnique({ where: { id: propertyId } });
        if (again?.status === PropertyStatus.PUBLISHED) {
          return { updated: again, transitioned: false };
        }
        throw new ConflictException({
          code: 'RELEASE_CONFLICT',
          message: 'Release failed: property state changed concurrently.',
        });
      }
      const next = await tx.property.findUniqueOrThrow({ where: { id: propertyId } });
      return { updated: next, transitioned: true };
    });

    if (transitioned) {
      await this.auditTrailService.write({
        actorUserId,
        action: 'PROPERTY_RESERVATION_RELEASED',
        entity: 'Property',
        entityId: propertyId,
        countryCode: updated.countryCode,
        metadata: {
          previousStatus: PropertyStatus.RESERVED,
          nextStatus: updated.status,
        },
      });
    }

    return { property: updated, idempotent: !transitioned };
  }

  private assertReserveAllowed(property: Property): void {
    if (property.status === PropertyStatus.RESERVED) {
      throw new ConflictException({
        code: 'PROPERTY_ALREADY_RESERVED',
        message: 'Property is already RESERVED.',
      });
    }
    if (property.status === PropertyStatus.BOOKED || property.status === PropertyStatus.OCCUPIED) {
      throw new ConflictException({
        code: 'PROPERTY_NOT_AVAILABLE_FOR_RESERVE',
        message: `Cannot reserve: property status is ${property.status}.`,
      });
    }
    if (property.status !== PropertyStatus.PUBLISHED) {
      throw new BadRequestException({
        code: 'INVALID_STATE_FOR_RESERVE',
        message: `Reserve is only allowed from PUBLISHED; current status is ${property.status}.`,
      });
    }
  }
}
