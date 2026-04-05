import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto, UpdatePaymentStatusDto } from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditTrailService: AuditTrailService,
    private readonly orchestratorService: OrchestratorService,
  ) {}

  private readonly allowedTransitions: Record<PaymentStatus, PaymentStatus[]> = {
    PENDING: ['PENDING', 'AUTHORIZED', 'SUCCEEDED', 'FAILED', 'WAIVED'],
    AUTHORIZED: ['AUTHORIZED', 'SUCCEEDED', 'FAILED', 'WAIVED'],
    SUCCEEDED: ['SUCCEEDED', 'REFUNDED'],
    FAILED: ['FAILED'],
    REFUNDED: ['REFUNDED'],
    WAIVED: ['WAIVED'],
  };

  private assertTransitionAllowed(fromStatus: PaymentStatus, toStatus: PaymentStatus) {
    const allowed = this.allowedTransitions[fromStatus] ?? [];
    if (!allowed.includes(toStatus)) {
      throw new BadRequestException(`Invalid payment status transition: ${fromStatus} -> ${toStatus}`);
    }
  }

  async create(userId: string, dto: CreatePaymentDto) {
    if (!dto.bookingId && !dto.unifiedRequestId) {
      throw new BadRequestException('Payment must be linked to a bookingId or unifiedRequestId');
    }

    const booking = dto.bookingId
      ? await this.prisma.booking.findUnique({
        where: { id: dto.bookingId },
        select: { id: true, tenantId: true, currency: true, unifiedRequestId: true, unifiedRequest: { select: { id: true, tenantId: true } } },
      })
      : null;
    if (dto.bookingId && !booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking && booking.tenantId !== userId) {
      throw new ForbiddenException('Cannot create payment for a booking you do not own');
    }

    const unifiedRequest = dto.unifiedRequestId
      ? await this.prisma.unifiedRequest.findUnique({
        where: { id: dto.unifiedRequestId },
        select: {
          id: true,
          tenantId: true,
          paymentStatus: true,
          country: true,
          serviceType: true,
          status: true,
          payment: { select: { id: true } },
          booking: { select: { id: true } },
        },
      })
      : null;
    if (dto.unifiedRequestId && !unifiedRequest) {
      throw new NotFoundException('Unified request not found');
    }
    if (unifiedRequest && unifiedRequest.tenantId !== userId) {
      throw new ForbiddenException('Cannot create payment for a request you do not own');
    }

    if (booking?.currency && booking.currency !== dto.currency) {
      throw new BadRequestException('Payment currency must match booking currency');
    }

    if (booking && unifiedRequest) {
      if (booking.unifiedRequestId && booking.unifiedRequestId !== unifiedRequest.id) {
        throw new BadRequestException('bookingId and unifiedRequestId reference different entities');
      }
      if (unifiedRequest.booking && unifiedRequest.booking.id !== booking.id) {
        throw new BadRequestException('unifiedRequestId is already linked to a different booking');
      }
    }

    if (unifiedRequest?.payment) {
      throw new BadRequestException('A payment already exists for this unified request');
    }

    if (unifiedRequest && (unifiedRequest.paymentStatus === 'SUCCEEDED' || unifiedRequest.paymentStatus === 'WAIVED')) {
      throw new BadRequestException('Payment is already resolved for this unified request');
    }

    const existingPendingPayment = booking
      ? await this.prisma.payment.findFirst({
        where: {
          bookingId: booking.id,
          userId,
          status: { in: ['PENDING', 'AUTHORIZED'] },
        },
        select: { id: true },
      })
      : null;
    if (existingPendingPayment) {
      throw new BadRequestException('A pending payment already exists for this booking');
    }

    const { payment, invoice } = await this.prisma.$transaction(async (tx) => {
      const createdPayment = await tx.payment.create({
        data: {
          userId,
          bookingId: dto.bookingId,
          unifiedRequestId: dto.unifiedRequestId,
          amountMinor: dto.amountMinor,
          currency: dto.currency,
          provider: dto.provider,
          providerRef: `pay_${Date.now()}`,
        },
      });

      const createdInvoice = await tx.invoice.create({
        data: {
          bookingId: dto.bookingId,
          paymentId: createdPayment.id,
          invoiceNumber: `INV-${Date.now()}`,
          subtotalMinor: dto.amountMinor,
          taxMinor: 0,
          totalMinor: dto.amountMinor,
          currency: dto.currency,
          dueDate: new Date(),
        },
      });

      return { payment: createdPayment, invoice: createdInvoice };
    });

    if (dto.unifiedRequestId) {
      await this.orchestratorService.reconcileRequestPaymentOutcome({
        unifiedRequestId: dto.unifiedRequestId,
        paymentId: payment.id,
        paymentStatus: payment.status,
        actorUserId: userId,
        trigger: 'payment-created',
      });
    }

    await this.auditTrailService.write({
      actorUserId: userId,
      action: 'PAYMENT_CREATED',
      entity: 'Payment',
      entityId: payment.id,
      countryCode: unifiedRequest?.country,
      metadata: {
        bookingId: dto.bookingId,
        unifiedRequestId: dto.unifiedRequestId,
        amountMinor: dto.amountMinor,
        currency: dto.currency,
      },
    });

    return { payment, invoice };
  }

  async updateStatus(paymentId: string, actorUserId: string, dto: UpdatePaymentStatusDto) {
    const existing = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        status: true,
        bookingId: true,
        unifiedRequestId: true,
        booking: { select: { id: true } },
        unifiedRequest: { select: { country: true } },
      },
    });
    if (!existing) {
      throw new NotFoundException('Payment not found');
    }

    this.assertTransitionAllowed(existing.status, dto.status);

    const payment = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: { status: dto.status },
      });

      if (updatedPayment.bookingId && (dto.status === 'SUCCEEDED' || dto.status === 'WAIVED')) {
        await tx.booking.update({
          where: { id: updatedPayment.bookingId },
          data: { status: 'CONFIRMED', confirmedAt: new Date() },
        });
      }

      if (dto.status === 'SUCCEEDED' || dto.status === 'WAIVED') {
        await tx.invoice.updateMany({
          where: { paymentId },
          data: { status: 'PAID', paidAt: new Date() },
        });
      } else if (dto.status === 'FAILED' || dto.status === 'REFUNDED') {
        await tx.invoice.updateMany({
          where: { paymentId },
          data: { status: 'VOID', paidAt: null },
        });
      } else {
        await tx.invoice.updateMany({
          where: { paymentId },
          data: { status: 'ISSUED' },
        });
      }

      return updatedPayment;
    });

    if (payment.unifiedRequestId) {
      await this.orchestratorService.reconcileRequestPaymentOutcome({
        unifiedRequestId: payment.unifiedRequestId,
        paymentId: payment.id,
        paymentStatus: payment.status,
        actorUserId,
        trigger: 'payment-status-updated',
      });
    }

    await this.auditTrailService.write({
      actorUserId,
      action: 'PAYMENT_STATUS_UPDATED',
      entity: 'Payment',
      entityId: payment.id,
      countryCode: existing.unifiedRequest?.country,
      metadata: {
        previousStatus: existing.status,
        status: payment.status,
      },
    });

    return payment;
  }

  listInvoices(userId: string) {
    return this.prisma.payment.findMany({ where: { userId }, include: { invoice: true, booking: true } });
  }
}