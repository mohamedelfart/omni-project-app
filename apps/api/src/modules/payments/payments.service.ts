import { Injectable } from '@nestjs/common';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto, UpdatePaymentStatusDto } from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditTrailService: AuditTrailService,
  ) {}

  async create(userId: string, dto: CreatePaymentDto) {
    const payment = await this.prisma.payment.create({
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

    const invoice = await this.prisma.invoice.create({
      data: {
        bookingId: dto.bookingId,
        paymentId: payment.id,
        invoiceNumber: `INV-${Date.now()}`,
        subtotalMinor: dto.amountMinor,
        taxMinor: 0,
        totalMinor: dto.amountMinor,
        currency: dto.currency,
        dueDate: new Date(),
      },
    });

    await this.auditTrailService.write({
      actorUserId: userId,
      action: 'PAYMENT_CREATED',
      entity: 'Payment',
      entityId: payment.id,
      metadata: {
        bookingId: dto.bookingId,
        unifiedRequestId: dto.unifiedRequestId,
        amountMinor: dto.amountMinor,
        currency: dto.currency,
      },
    });

    return { payment, invoice };
  }

  async updateStatus(paymentId: string, dto: UpdatePaymentStatusDto) {
    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: dto.status as never },
    });

    if (payment.bookingId && dto.status === 'SUCCEEDED') {
      await this.prisma.booking.update({ where: { id: payment.bookingId }, data: { status: 'CONFIRMED', confirmedAt: new Date() } });
    }

    if (dto.status === 'SUCCEEDED') {
      await this.prisma.invoice.updateMany({
        where: { paymentId },
        data: { status: 'PAID', paidAt: new Date() },
      });
    }

    await this.auditTrailService.write({
      action: 'PAYMENT_STATUS_UPDATED',
      entity: 'Payment',
      entityId: payment.id,
      metadata: {
        status: dto.status,
      },
    });

    return payment;
  }

  listInvoices(userId: string) {
    return this.prisma.payment.findMany({ where: { userId }, include: { invoice: true, booking: true } });
  }
}