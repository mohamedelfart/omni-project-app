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
  moveInDate: Date;
  termMonths: number;
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

  private assertContractReadiness(booking: BookingWithContext): void {
    if (!this.hasSuccessfulSettlement(booking)) {
      throw new BadRequestException({
        code: 'PAYMENT_NOT_SETTLED',
        message: 'Contract readiness failed: payment is not settled (SUCCEEDED/WAIVED).',
      });
    }
    if (!booking.confirmedAt) {
      throw new BadRequestException({
        code: 'BOOKING_NOT_CONFIRMED',
        message: 'Contract readiness failed: booking is not confirmed.',
      });
    }
    if (booking.termMonths <= 0) {
      throw new BadRequestException({
        code: 'INVALID_BOOKING_TERM',
        message: 'Contract readiness failed: booking term must be greater than zero.',
      });
    }
  }

  private assertContractReadinessFromSnapshot(snapshot: {
    payments: Array<{ status: PaymentStatus }>;
    unifiedRequest: { paymentStatus: PaymentStatus } | null;
    confirmedAt: Date | null;
    termMonths: number;
  }): void {
    const settled = snapshot.payments.some((p) => p.status === 'SUCCEEDED' || p.status === 'WAIVED')
      || (snapshot.unifiedRequest
        ? snapshot.unifiedRequest.paymentStatus === 'SUCCEEDED' || snapshot.unifiedRequest.paymentStatus === 'WAIVED'
        : false);
    if (!settled) {
      throw new BadRequestException({
        code: 'PAYMENT_NOT_SETTLED',
        message: 'Contract readiness failed: payment is not settled (SUCCEEDED/WAIVED).',
      });
    }
    if (!snapshot.confirmedAt) {
      throw new BadRequestException({
        code: 'BOOKING_NOT_CONFIRMED',
        message: 'Contract readiness failed: booking is not confirmed.',
      });
    }
    if (snapshot.termMonths <= 0) {
      throw new BadRequestException({
        code: 'INVALID_BOOKING_TERM',
        message: 'Contract readiness failed: booking term must be greater than zero.',
      });
    }
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

  async moveBookingToContractPending(actorUserId: string, bookingId: string) {
    const booking = await this.getBookingOrThrow(bookingId);

    if (booking.status === 'CONTRACT_PENDING') {
      throw new ConflictException({
        code: 'BOOKING_ALREADY_CONTRACT_PENDING',
        message: 'Booking is already in CONTRACT_PENDING state.',
      });
    }
    if (booking.status === 'ACTIVE') {
      throw new ConflictException({
        code: 'BOOKING_ALREADY_ACTIVE',
        message: 'Cannot move to CONTRACT_PENDING: booking is already ACTIVE.',
      });
    }
    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      throw new BadRequestException({
        code: 'INVALID_BOOKING_STATE_FOR_CONTRACT_PENDING',
        message: `Cannot move to CONTRACT_PENDING from ${booking.status}.`,
      });
    }
    if (booking.status !== 'CONFIRMED') {
      throw new BadRequestException({
        code: 'BOOKING_NOT_CONFIRMED',
        message: `Contract pending requires CONFIRMED booking; current status is ${booking.status}.`,
      });
    }

    this.assertContractReadiness(booking);

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
      if (row.status !== 'CONFIRMED') {
        throw new ConflictException({
          code: 'CONTRACT_PENDING_CONFLICT',
          message: `Cannot move to CONTRACT_PENDING: booking is no longer CONFIRMED (${row.status}).`,
        });
      }
      this.assertContractReadinessFromSnapshot({
        payments: row.payments,
        unifiedRequest: row.unifiedRequest,
        confirmedAt: row.confirmedAt,
        termMonths: row.termMonths,
      });

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CONTRACT_PENDING' },
      });

      return tx.booking.findUniqueOrThrow({
        where: { id: bookingId },
        include: { property: true, payments: true, unifiedRequest: true },
      });
    });

    await this.auditTrailService.write({
      actorUserId,
      action: 'BOOKING_CONTRACT_PENDING',
      entity: 'Booking',
      entityId: bookingId,
      countryCode: booking.property.countryCode,
      metadata: {
        previousStatus: booking.status,
        nextStatus: 'CONTRACT_PENDING',
        propertyId: booking.propertyId,
      },
    });

    return updated;
  }

  async activateLease(actorUserId: string, bookingId: string) {
    const booking = await this.getBookingOrThrow(bookingId);

    if (booking.status === 'ACTIVE') {
      throw new ConflictException({
        code: 'BOOKING_ALREADY_ACTIVE',
        message: 'Booking is already ACTIVE.',
      });
    }
    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      throw new BadRequestException({
        code: 'INVALID_BOOKING_STATE_FOR_ACTIVATION',
        message: `Cannot activate lease from ${booking.status}.`,
      });
    }
    if (booking.status !== 'CONTRACT_PENDING') {
      throw new BadRequestException({
        code: 'CONTRACT_NOT_READY',
        message: `Lease activation requires CONTRACT_PENDING booking; current status is ${booking.status}.`,
      });
    }

    this.assertContractReadiness(booking);
    if (booking.moveInDate.getTime() > Date.now()) {
      throw new BadRequestException({
        code: 'MOVE_IN_DATE_NOT_REACHED',
        message: 'Cannot activate lease before move-in date.',
      });
    }
    if (booking.property.status === 'RESERVED' || booking.property.status === 'INACTIVE') {
      throw new ConflictException({
        code: 'PROPERTY_STATE_CONFLICT',
        message: `Cannot activate lease while property status is ${booking.property.status}.`,
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
      if (row.status !== 'CONTRACT_PENDING') {
        throw new ConflictException({
          code: 'ACTIVATION_CONFLICT',
          message: `Lease activation failed: booking is no longer CONTRACT_PENDING (${row.status}).`,
        });
      }
      this.assertContractReadinessFromSnapshot({
        payments: row.payments,
        unifiedRequest: row.unifiedRequest,
        confirmedAt: row.confirmedAt,
        termMonths: row.termMonths,
      });
      if (row.moveInDate.getTime() > Date.now()) {
        throw new BadRequestException({
          code: 'MOVE_IN_DATE_NOT_REACHED',
          message: 'Cannot activate lease before move-in date.',
        });
      }
      if (row.property.status === 'RESERVED' || row.property.status === 'INACTIVE') {
        throw new ConflictException({
          code: 'PROPERTY_STATE_CONFLICT',
          message: `Cannot activate lease while property status is ${row.property.status}.`,
        });
      }

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'ACTIVE' },
      });

      if (row.property.status === 'BOOKED') {
        await tx.property.update({
          where: { id: row.property.id },
          data: { status: 'OCCUPIED' },
        });
      }

      return tx.booking.findUniqueOrThrow({
        where: { id: bookingId },
        include: { property: true, payments: true, unifiedRequest: true },
      });
    });

    await this.auditTrailService.write({
      actorUserId,
      action: 'BOOKING_ACTIVATED',
      entity: 'Booking',
      entityId: bookingId,
      countryCode: booking.property.countryCode,
      metadata: {
        previousStatus: booking.status,
        nextStatus: 'ACTIVE',
        propertyId: booking.propertyId,
        propertyStatusAfter: updated.property.status,
      },
    });

    return updated;
  }

  async completeLease(actorUserId: string, bookingId: string) {
    const booking = await this.getBookingOrThrow(bookingId);

    if (booking.status === 'COMPLETED') {
      throw new ConflictException({
        code: 'BOOKING_ALREADY_COMPLETED',
        message: 'Booking is already COMPLETED.',
      });
    }
    if (booking.status === 'CANCELLED') {
      throw new BadRequestException({
        code: 'INVALID_BOOKING_STATE_FOR_COMPLETION',
        message: 'Cannot complete lease from CANCELLED state.',
      });
    }
    if (booking.status !== 'ACTIVE') {
      throw new BadRequestException({
        code: 'INVALID_BOOKING_STATE_FOR_COMPLETION',
        message: `Lease completion requires ACTIVE booking; current status is ${booking.status}.`,
      });
    }
    if (booking.property.status !== 'OCCUPIED') {
      throw new ConflictException({
        code: 'PROPERTY_STATE_CONFLICT',
        message: `Cannot complete lease while property status is ${booking.property.status}; expected OCCUPIED.`,
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          property: { select: { id: true, status: true } },
        },
      });
      if (!row) {
        throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: `Booking ${bookingId} not found` });
      }
      if (row.status === 'COMPLETED') {
        throw new ConflictException({
          code: 'BOOKING_ALREADY_COMPLETED',
          message: 'Booking is already COMPLETED.',
        });
      }
      if (row.status === 'CANCELLED' || row.status !== 'ACTIVE') {
        throw new ConflictException({
          code: 'COMPLETION_CONFLICT',
          message: `Lease completion failed: booking is no longer ACTIVE (${row.status}).`,
        });
      }
      if (row.property.status !== 'OCCUPIED') {
        throw new ConflictException({
          code: 'PROPERTY_STATE_CONFLICT',
          message: `Cannot complete lease while property status is ${row.property.status}; expected OCCUPIED.`,
        });
      }

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'COMPLETED' },
      });

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

      return tx.booking.findUniqueOrThrow({
        where: { id: bookingId },
        include: { property: true, payments: true, unifiedRequest: true },
      });
    });

    await this.auditTrailService.write({
      actorUserId,
      action: 'BOOKING_COMPLETED_COMMAND',
      entity: 'Booking',
      entityId: bookingId,
      countryCode: booking.property.countryCode,
      metadata: {
        previousStatus: booking.status,
        nextStatus: 'COMPLETED',
        propertyId: booking.propertyId,
        propertyStatusAfter: updated.property.status,
      },
    });

    return updated;
  }
}

