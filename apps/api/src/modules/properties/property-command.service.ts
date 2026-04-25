import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, Prisma, Property, PropertyStatus, ServiceRequestStatus } from '@prisma/client';
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

export type PropertyHideResult = {
  property: Property;
};

export type PropertyRepublishResult = {
  property: Property;
};

export type PropertyMaintenanceHoldResult = {
  property: Property;
  maintenanceRequestId: string;
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

  /**
   * Command: hide property from tenant discovery.
   * PUBLISHED -> INACTIVE.
   */
  async hideProperty(actorUserId: string, propertyId: string): Promise<PropertyHideResult> {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      throw new NotFoundException({ code: 'PROPERTY_NOT_FOUND', message: `Property ${propertyId} not found` });
    }

    if (property.status === PropertyStatus.INACTIVE) {
      throw new ConflictException({
        code: 'PROPERTY_ALREADY_HIDDEN',
        message: 'Property is already INACTIVE.',
      });
    }
    if (property.status === PropertyStatus.BOOKED || property.status === PropertyStatus.OCCUPIED || property.status === PropertyStatus.RESERVED) {
      throw new ConflictException({
        code: 'PROPERTY_NOT_ALLOWED_TO_HIDE',
        message: `Cannot hide: property status is ${property.status}.`,
      });
    }
    if (property.status !== PropertyStatus.PUBLISHED) {
      throw new BadRequestException({
        code: 'INVALID_STATE_FOR_HIDE',
        message: `Hide is only allowed from PUBLISHED; current status is ${property.status}.`,
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.property.updateMany({
        where: { id: propertyId, status: PropertyStatus.PUBLISHED },
        data: { status: PropertyStatus.INACTIVE },
      });
      if (result.count !== 1) {
        throw new ConflictException({
          code: 'HIDE_CONFLICT',
          message: 'Hide failed: property state changed concurrently.',
        });
      }
      return tx.property.findUniqueOrThrow({ where: { id: propertyId } });
    });

    await this.auditTrailService.write({
      actorUserId,
      action: 'PROPERTY_HIDDEN',
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
   * Command: republish hidden property back to tenant discovery.
   * INACTIVE -> PUBLISHED.
   */
  async republishProperty(actorUserId: string, propertyId: string): Promise<PropertyRepublishResult> {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      throw new NotFoundException({ code: 'PROPERTY_NOT_FOUND', message: `Property ${propertyId} not found` });
    }

    if (property.status === PropertyStatus.BOOKED || property.status === PropertyStatus.OCCUPIED) {
      throw new ConflictException({
        code: 'PROPERTY_NOT_ALLOWED_TO_PUBLISH',
        message: `Cannot publish: property status is ${property.status}.`,
      });
    }
    if (property.status === PropertyStatus.PUBLISHED) {
      throw new ConflictException({
        code: 'PROPERTY_ALREADY_PUBLISHED',
        message: 'Property is already PUBLISHED.',
      });
    }
    if (property.status !== PropertyStatus.INACTIVE) {
      throw new BadRequestException({
        code: 'INVALID_STATE_FOR_PUBLISH',
        message: `Publish is only allowed from INACTIVE; current status is ${property.status}.`,
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.property.updateMany({
        where: { id: propertyId, status: PropertyStatus.INACTIVE },
        data: { status: PropertyStatus.PUBLISHED },
      });
      if (result.count !== 1) {
        throw new ConflictException({
          code: 'PUBLISH_CONFLICT',
          message: 'Publish failed: property state changed concurrently.',
        });
      }
      return tx.property.findUniqueOrThrow({ where: { id: propertyId } });
    });

    await this.auditTrailService.write({
      actorUserId,
      action: 'PROPERTY_REPUBLISHED',
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
   * Command: start operational maintenance hold on a property.
   * This does not change PropertyStatus (distinct from hide/reserve).
   * Inventory blocking truth is persisted on the linked MaintenanceRequest metadata.
   */
  async startMaintenanceHold(
    actorUserId: string,
    propertyId: string,
    maintenanceRequestId: string,
  ): Promise<PropertyMaintenanceHoldResult> {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      throw new NotFoundException({ code: 'PROPERTY_NOT_FOUND', message: `Property ${propertyId} not found` });
    }
    this.assertMaintenanceHoldAllowed(property);

    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id: maintenanceRequestId },
      include: { unifiedRequest: true },
    });
    if (!request) {
      throw new NotFoundException({ code: 'MAINTENANCE_REQUEST_NOT_FOUND', message: `MaintenanceRequest ${maintenanceRequestId} not found` });
    }
    if (request.unifiedRequest.serviceType !== 'maintenance') {
      throw new BadRequestException({
        code: 'INVALID_MAINTENANCE_REQUEST',
        message: `Request ${maintenanceRequestId} is not a maintenance workflow.`,
      });
    }
    if (request.propertyId !== propertyId) {
      throw new BadRequestException({
        code: 'PROPERTY_REQUEST_MISMATCH',
        message: 'Maintenance request is not linked to this property.',
      });
    }
    if (request.status === ServiceRequestStatus.COMPLETED || request.status === ServiceRequestStatus.CANCELLED || request.status === ServiceRequestStatus.REJECTED) {
      throw new BadRequestException({
        code: 'MAINTENANCE_REQUEST_TERMINAL',
        message: `Cannot start hold: maintenance request status is ${request.status}.`,
      });
    }

    const activeHold = await this.findActiveMaintenanceHoldByProperty(propertyId);
    if (activeHold) {
      throw new ConflictException({
        code: 'PROPERTY_MAINTENANCE_HOLD_ACTIVE',
        message: 'Property is already under maintenance hold.',
        activeMaintenanceRequestId: activeHold.id,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      const concurrentHold = await tx.maintenanceRequest.findFirst({
        where: {
          propertyId,
          metadata: {
            path: ['maintenanceHold', 'active'],
            equals: true,
          },
        },
      });
      if (concurrentHold) {
        throw new ConflictException({
          code: 'PROPERTY_MAINTENANCE_HOLD_ACTIVE',
          message: 'Property is already under maintenance hold.',
          activeMaintenanceRequestId: concurrentHold.id,
        });
      }

      const current = await tx.maintenanceRequest.findUniqueOrThrow({ where: { id: maintenanceRequestId } });
      const currentMeta = this.toRecord(current.metadata);
      const holdMeta = this.toRecord(currentMeta.maintenanceHold);
      const nextMetadata = {
        ...currentMeta,
        maintenanceHold: {
          ...holdMeta,
          active: true,
          startedAt: new Date().toISOString(),
          startedByUserId: actorUserId,
          propertyId,
        },
      };

      await tx.maintenanceRequest.update({
        where: { id: maintenanceRequestId },
        data: {
          status: current.status === ServiceRequestStatus.PENDING ? ServiceRequestStatus.IN_PROGRESS : current.status,
          metadata: this.toJson(nextMetadata),
        },
      });
    });

    await this.auditTrailService.write({
      actorUserId,
      action: 'PROPERTY_MAINTENANCE_HOLD_STARTED',
      entity: 'Property',
      entityId: propertyId,
      countryCode: property.countryCode,
      metadata: {
        maintenanceRequestId,
      },
    });

    return { property, maintenanceRequestId };
  }

  /**
   * Command: release operational maintenance hold.
   * Safe idempotency: if hold is already inactive on this request, returns success.
   */
  async releaseMaintenanceHold(
    actorUserId: string,
    propertyId: string,
    maintenanceRequestId: string,
  ): Promise<PropertyMaintenanceHoldResult> {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      throw new NotFoundException({ code: 'PROPERTY_NOT_FOUND', message: `Property ${propertyId} not found` });
    }

    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id: maintenanceRequestId },
    });
    if (!request) {
      throw new NotFoundException({ code: 'MAINTENANCE_REQUEST_NOT_FOUND', message: `MaintenanceRequest ${maintenanceRequestId} not found` });
    }
    if (request.propertyId !== propertyId) {
      throw new BadRequestException({
        code: 'PROPERTY_REQUEST_MISMATCH',
        message: 'Maintenance request is not linked to this property.',
      });
    }

    const activeHold = await this.findActiveMaintenanceHoldByProperty(propertyId);
    if (!activeHold) {
      throw new BadRequestException({
        code: 'MAINTENANCE_HOLD_NOT_ACTIVE',
        message: 'Property is not under maintenance hold.',
      });
    }
    if (activeHold.id !== maintenanceRequestId) {
      throw new ConflictException({
        code: 'MAINTENANCE_HOLD_REQUEST_MISMATCH',
        message: 'Active maintenance hold belongs to a different maintenance request.',
        activeMaintenanceRequestId: activeHold.id,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      const current = await tx.maintenanceRequest.findUniqueOrThrow({ where: { id: maintenanceRequestId } });
      const currentMeta = this.toRecord(current.metadata);
      const holdMeta = this.toRecord(currentMeta.maintenanceHold);
      const isActive = holdMeta.active === true;
      if (!isActive) {
        return;
      }
      const nextMetadata = {
        ...currentMeta,
        maintenanceHold: {
          ...holdMeta,
          active: false,
          releasedAt: new Date().toISOString(),
          releasedByUserId: actorUserId,
          propertyId,
        },
      };
      await tx.maintenanceRequest.update({
        where: { id: maintenanceRequestId },
        data: {
          metadata: this.toJson(nextMetadata),
        },
      });
    });

    await this.auditTrailService.write({
      actorUserId,
      action: 'PROPERTY_MAINTENANCE_HOLD_RELEASED',
      entity: 'Property',
      entityId: propertyId,
      countryCode: property.countryCode,
      metadata: {
        maintenanceRequestId,
      },
    });

    return { property, maintenanceRequestId };
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

  private assertMaintenanceHoldAllowed(property: Property): void {
    if (property.status === PropertyStatus.BOOKED || property.status === PropertyStatus.OCCUPIED) {
      throw new ConflictException({
        code: 'PROPERTY_NOT_ALLOWED_FOR_MAINTENANCE_HOLD',
        message: `Cannot start maintenance hold: property status is ${property.status}.`,
      });
    }
    if (property.status === PropertyStatus.RESERVED) {
      throw new ConflictException({
        code: 'PROPERTY_RESERVED_CONFLICT',
        message: 'Cannot start maintenance hold while property is RESERVED.',
      });
    }
    if (property.status !== PropertyStatus.PUBLISHED && property.status !== PropertyStatus.INACTIVE) {
      throw new BadRequestException({
        code: 'INVALID_STATE_FOR_MAINTENANCE_HOLD',
        message: `Maintenance hold is only allowed from PUBLISHED/INACTIVE; current status is ${property.status}.`,
      });
    }
  }

  private async findActiveMaintenanceHoldByProperty(propertyId: string) {
    return this.prisma.maintenanceRequest.findFirst({
      where: {
        propertyId,
        metadata: {
          path: ['maintenanceHold', 'active'],
          equals: true,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
  }

  private toRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }
}
