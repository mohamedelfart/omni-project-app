import { Injectable } from '@nestjs/common';
import { Prisma, UnifiedRequestStatus } from '@prisma/client';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import {
  AssignVendorDto,
  CreateRealtimeRequestDto,
  CreateUnifiedRequestDto,
  DispatchInstructionDto,
  RequestStatus,
  UpdateRealtimeRequestStatusDto,
} from './dto/unified-request.dto';
import { REQUEST_SOCKET_EVENTS } from './unified-requests.events';
import { UnifiedRequestsGateway } from './unified-requests.gateway';

@Injectable()
export class UnifiedRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestratorService: OrchestratorService,
    private readonly auditTrailService: AuditTrailService,
    private readonly unifiedRequestsGateway: UnifiedRequestsGateway,
  ) {}

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
  }

  async create(userId: string, dto: CreateUnifiedRequestDto) {
    const unifiedRequest = await this.prisma.unifiedRequest.create({
      data: {
        userId,
        tenantId: userId,
        requestType: dto.requestType,
        serviceType: dto.serviceType,
        source: 'tenant-app',
        destination: 'core',
        country: dto.country,
        city: dto.city,
        propertyIds: dto.propertyIds ?? [],
        preferredTime: dto.preferredTime ? new Date(dto.preferredTime) : undefined,
        locationLabel: dto.locationLabel,
        currentLat: dto.currentLat,
        currentLng: dto.currentLng,
        targetLat: dto.targetLat,
        targetLng: dto.targetLng,
        pickupLat: dto.pickupLat,
        pickupLng: dto.pickupLng,
        dropoffLat: dto.dropoffLat,
        dropoffLng: dto.dropoffLng,
        metadata: this.toJson(dto.metadata),
        trackingEvents: {
          create: [{ actorType: 'tenant', title: 'Request submitted', status: 'SUBMITTED' }],
        },
      },
      include: { trackingEvents: true },
    });

    const routing = await this.orchestratorService.routeRequest(unifiedRequest.id);

    await this.auditTrailService.write({
      actorUserId: userId,
      action: 'UNIFIED_REQUEST_CREATED',
      entity: 'UnifiedRequest',
      entityId: unifiedRequest.id,
      countryCode: unifiedRequest.country,
      metadata: {
        requestType: unifiedRequest.requestType,
        serviceType: unifiedRequest.serviceType,
        source: unifiedRequest.source,
        destination: unifiedRequest.destination,
        routing,
      },
    });

    return { ...unifiedRequest, routing };
  }

  listAll() {
    return this.prisma.unifiedRequest.findMany({ include: { trackingEvents: true }, orderBy: { createdAt: 'desc' } });
  }

  listMine(userId: string) {
    return this.prisma.unifiedRequest.findMany({
      where: { userId },
      include: { trackingEvents: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  listRealtimeMine(userId: string) {
    return this.prisma.unifiedRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }).then((items) => items.map((item) => this.toMinimalRequest(item)));
  }

  getById(requestId: string) {
    return this.prisma.unifiedRequest.findUniqueOrThrow({ where: { id: requestId }, include: { trackingEvents: true } });
  }

  dispatchInstruction(requestId: string, dto: DispatchInstructionDto) {
    void this.auditTrailService.write({
      action: 'UNIFIED_REQUEST_INSTRUCTION_RECEIVED',
      entity: 'UnifiedRequest',
      entityId: requestId,
      metadata: {
        instructionType: dto.instructionType,
      },
    });
    return this.orchestratorService.dispatchInstruction(requestId, dto.instructionType, dto.payload);
  }

  async createRealtimeRequest(userId: string, dto: CreateRealtimeRequestDto) {
    const created = await this.prisma.unifiedRequest.create({
      data: {
        userId,
        tenantId: userId,
        requestType: dto.type,
        serviceType: dto.type,
        source: 'tenant-app',
        destination: 'core',
        country: 'QA',
        city: 'Doha',
        propertyIds: [],
        status: UnifiedRequestStatus.SUBMITTED,
        vendorId: dto.vendorId,
      },
    });

    const minimal = this.toMinimalRequest(created);
    this.unifiedRequestsGateway.emitToRooms(
      REQUEST_SOCKET_EVENTS.created,
      [`user:${minimal.tenantId}`, 'role:admin', 'role:command-center'],
      { request: minimal },
    );
    return minimal;
  }

  listRealtimeForDashboard() {
    return this.prisma.unifiedRequest.findMany({
      orderBy: { createdAt: 'desc' },
    }).then((items) => items.map((item) => this.toMinimalRequest(item)));
  }

  listRealtimeForVendor(vendorId: string) {
    return this.prisma.unifiedRequest.findMany({
      where: {
        OR: [{ vendorId }, { vendorId: null }],
      },
      orderBy: { createdAt: 'desc' },
    }).then((items) => items.map((item) => this.toMinimalRequest(item)));
  }

  async assignVendor(requestId: string, dto: AssignVendorDto) {
    const updated = await this.prisma.unifiedRequest.update({
      where: { id: requestId },
      data: {
        vendorId: dto.vendorId,
        status: UnifiedRequestStatus.ASSIGNED,
      },
    });

    const minimal = this.toMinimalRequest(updated);
    this.unifiedRequestsGateway.emitToRooms(
      REQUEST_SOCKET_EVENTS.assigned,
      [
        `user:${minimal.tenantId}`,
        `user:${dto.vendorId}`,
        'role:provider',
        'role:admin',
        'role:command-center',
      ],
      { request: minimal, vendorId: dto.vendorId },
    );
    return minimal;
  }

  async updateRealtimeStatus(requestId: string, vendorId: string, dto: UpdateRealtimeRequestStatusDto) {
    const updated = await this.prisma.unifiedRequest.update({
      where: { id: requestId },
      data: {
        status: this.fromMinimalStatus(dto.status),
        vendorId,
      },
    });

    const minimal = this.toMinimalRequest(updated);
    this.unifiedRequestsGateway.emitToRooms(
      REQUEST_SOCKET_EVENTS.updated,
      [
        `user:${minimal.tenantId}`,
        ...(minimal.vendorId ? [`user:${minimal.vendorId}`] : []),
        'role:provider',
        'role:admin',
        'role:command-center',
      ],
      { request: minimal, changedFields: ['status'] },
    );
    return minimal;
  }

  private toMinimalRequest(request: {
    id: string;
    tenantId: string;
    vendorId: string | null;
    requestType: string;
    status: UnifiedRequestStatus;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: request.id,
      tenantId: request.tenantId,
      vendorId: request.vendorId ?? undefined,
      type: request.requestType,
      status: this.toMinimalStatus(request.status),
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }

  private toMinimalStatus(status: UnifiedRequestStatus): RequestStatus {
    switch (status) {
      case UnifiedRequestStatus.ASSIGNED:
        return 'assigned';
      case UnifiedRequestStatus.IN_PROGRESS:
        return 'in_progress';
      case UnifiedRequestStatus.COMPLETED:
        return 'completed';
      default:
        return 'pending';
    }
  }

  private fromMinimalStatus(status: Exclude<RequestStatus, 'pending'>): UnifiedRequestStatus {
    switch (status) {
      case 'assigned':
        return UnifiedRequestStatus.ASSIGNED;
      case 'in_progress':
        return UnifiedRequestStatus.IN_PROGRESS;
      case 'completed':
        return UnifiedRequestStatus.COMPLETED;
    }
  }
}