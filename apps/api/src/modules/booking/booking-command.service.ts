import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, PaymentStatus, PropertyStatus } from '@prisma/client';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { PrismaService } from '../prisma/prisma.service';

type BookingWithContext = {
  id: string;
  status: BookingStatus;
  tenantId: string;
  propertyId: string;
  unifiedRequestId: string | null;
  confirmedAt: Date | null;
  property: {
    id: string;
    status: PropertyStatus;
    countryCode: string;
  };
  unifiedRequest: {
    id: string;
    paymentStatus: PaymentStatus;
  } | null;
  payments: Array<{
    id: string;
    status: PaymentStatus;
  }>;
};

@Injectable()
export class BookingCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditTrailService: AuditTrailService,
  ) {}

  private async getBookingOrThrow(bookingId: string): Promise<BookingWithContext> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: { select: { id: true, status: true, countryCode: true } },
        unifiedRequest: { select: { id: true, paymentStatus: true } },
        payments: { select: { id: true, status: true } },
      },
    });
    if (!booking) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: `Booking ${bookingId} not found` });
    }
    return booking;
  }

  private hasSuccessfulSettlement(booking: BookingWithContext): boolean {
    const bookingPaymentResolved = booking.payments.some((p) => p.status === 'SUCCEEDED' || p.status === 'WAIVED');
    const requestPaymentResolved = booking.unifiedRequest
      ? booking.unifiedRequest.paymentStatus === 'SUCCEEDED' || booking.unifiedRequest.paymentStatus === 'WAIVED'
      : false;
    return bookingPaymentResolved || requestPaymentResolved;
  }

  async confirmBooking(actorUserId: string, bookingId: string) {
    const booking = await this.getBookingOrThrow(bookingId);

    if (booking.status === 'CONFIRMED' || booking.status === 'ACTIVE' || booking.status === 'COMPLETED') {
      throw new ConflictException({
        code: 'BOOKING_ALREADY_CONFIRMED',
        message: `Booking is already in confirmed/active/completed lifecycle (${booking.status}).`,
      });
    }
    if (booking.status === 'CANCELLED') {
      throw new BadRequestException({
        code: 'BOOKING_CANCELLED',
        message: 'Cannot confirm a cancelled booking.',
      });
    }
    if (booking.status !== 'RESERVED') {
      throw new BadRequestException({
        code: 'INVALID_BOOKING_STATE_FOR_CONFIRM',
        message: `Confirm is only allowed from RESERVED; current status is ${booking.status}.`,
      });
    }
    if (!this.hasSuccessfulSettlement(booking)) {
      throw new BadRequestException({
        code: 'PAYMENT_NOT_SETTLED',
        message: 'Cannot confirm booking before successful/waived payment settlement.',
      });
    }
    if (booking.property.status === 'RESERVED') {
      throw new ConflictException({
        code: 'PROPERTY_RESERVED_CONFLICT',
        message: 'Cannot confirm booking while property is under reserve command.',
      });
    }
    if (booking.property.status === 'INACTIVE') {
      throw new ConflictException({
        code: 'PROPERTY_HIDDEN_CONFLICT',
        message: 'Cannot confirm booking while property is hidden/inactive.',
      });
    }
    if (booking.property.status === 'OCCUPIED') {
      throw new ConflictException({
        code: 'PROPERTY_OCCUPIED_CONFLICT',
        message: 'Cannot confirm booking: property is OCCUPIED.',
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          property: { select: { id: true, status: true } },
          unifiedRequest: { select: { paymentStatus: true } },
          payments: { select: { status: true } },
        },
      });
      if (!row) {
        throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: `Booking ${bookingId} not found` });
      }

      if (row.status !== 'RESERVED') {
        throw new ConflictException({
          code: 'CONFIRM_CONFLICT',
          message: `Confirm failed: booking is no longer RESERVED (${row.status}).`,
        });
      }
      const settled = row.payments.some((p) => p.status === 'SUCCEEDED' || p.status === 'WAIVED')
        || (row.unifiedRequest ? ['SUCCEEDED', 'WAIVED'].includes(row.unifiedRequest.paymentStatus) : false);
      if (!settled) {
        throw new BadRequestException({
          code: 'PAYMENT_NOT_SETTLED',
          message: 'Cannot confirm booking before successful/waived payment settlement.',
        });
      }

      const propertyStatus = row.property.status;
      if (propertyStatus === 'RESERVED' || propertyStatus === 'INACTIVE' || propertyStatus === 'OCCUPIED') {
        throw new ConflictException({
          code: 'PROPERTY_STATE_CONFLICT',
          message: `Cannot confirm booking: property status is ${propertyStatus}.`,
        });
      }

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED', confirmedAt: row.confirmedAt ?? new Date() },
      });

      if (propertyStatus === 'PUBLISHED') {
        await tx.property.update({
          where: { id: row.property.id },
          data: { status: 'BOOKED' },
        });
      }

      return tx.booking.findUniqueOrThrow({
        where: { id: bookingId },
        include: { property: true, payments: true, unifiedRequest: true },
      });
    });

    await this.auditTrailService.write({
      actorUserId,
      action: 'BOOKING_CONFIRMED_COMMAND',
      entity: 'Booking',
      entityId: bookingId,
      countryCode: booking.property.countryCode,
      metadata: {
        previousStatus: booking.status,
        nextStatus: 'CONFIRMED',
        propertyId: booking.propertyId,
        propertyStatusAfter: updated.property.status,
      },
    });

    return updated;
  }

  async cancelReservedBooking(actorUserId: string, bookingId: string) {
    const booking = await this.getBookingOrThrow(bookingId);

    if (booking.status === 'CANCELLED') {
      throw new ConflictException({
        code: 'BOOKING_ALREADY_CANCELLED',
        message: 'Booking is already CANCELLED.',
      });
    }
    if (booking.status === 'ACTIVE' || booking.status === 'COMPLETED') {
      throw new ConflictException({
        code: 'BOOKING_NOT_CANCELLABLE',
        message: `Cannot cancel booking in ${booking.status} state.`,
      });
    }
    if (booking.status !== 'RESERVED') {
      throw new BadRequestException({
        code: 'INVALID_BOOKING_STATE_FOR_CANCEL',
        message: `Cancel command is only allowed from RESERVED; current status is ${booking.status}.`,
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { property: true },
      });
      if (!row) {
        throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: `Booking ${bookingId} not found` });
      }
      if (row.status !== 'RESERVED') {
        throw new ConflictException({
          code: 'CANCEL_CONFLICT',
          message: `Cancel failed: booking is no longer RESERVED (${row.status}).`,
        });
      }
      if (row.property.status === 'OCCUPIED') {
        throw new ConflictException({
          code: 'PROPERTY_OCCUPIED_CONFLICT',
          message: 'Cannot rollback inventory from OCCUPIED during reserved-booking cancellation.',
        });
      }
      if (row.property.status === 'RESERVED') {
        throw new ConflictException({
          code: 'PROPERTY_RESERVED_CONFLICT',
          message: 'Cannot cancel reserved booking while property is under reserve command.',
        });
      }

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
      });

      if (row.property.status === 'BOOKED') {
        const activeHold = await tx.maintenanceRequest.findFirst({
          where: {
            propertyId: row.property.id,
            metadata: {
              path: ['maintenanceHold', 'active'],
              equals: true,
            },
          },
          select: { id: true },
        });
        await tx.property.update({
          where: { id: row.property.id },
          data: { status: activeHold ? 'INACTIVE' : 'PUBLISHED' },
        });
      }

      return tx.booking.findUniqueOrThrow({
        where: { id: bookingId },
        include: { property: true, payments: true, unifiedRequest: true },
      });
    });

    await this.auditTrailService.write({
      actorUserId,
      action: 'BOOKING_CANCELLED_COMMAND',
      entity: 'Booking',
      entityId: bookingId,
      countryCode: booking.property.countryCode,
      metadata: {
        previousStatus: booking.status,
        nextStatus: 'CANCELLED',
        propertyId: booking.propertyId,
        propertyStatusAfter: updated.property.status,
      },
    });

    return updated;
  }
}

