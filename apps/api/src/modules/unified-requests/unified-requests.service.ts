import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RequestPriority, UnifiedRequestStatus } from '@prisma/client';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import type { TicketAction } from '@quickrent/shared-types';
import { TicketActionsService } from '../ticket-actions/ticket-actions.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import {
  AssignVendorDto,
  ChangeUnifiedRequestPriorityDto,
  CreateRealtimeRequestDto,
  CreateUnifiedRequestDto,
  DispatchInstructionDto,
  EscalateRequestDto,
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
    private readonly ticketActionsService: TicketActionsService,
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

  async getTicketActionHistory(requestId: string, user: AuthenticatedUser): Promise<TicketAction[]> {
    const ticket = await this.prisma.unifiedRequest.findUnique({
      where: { id: requestId },
      select: { id: true, tenantId: true, userId: true, vendorId: true },
    });
    if (!ticket) {
      throw new NotFoundException('Request not found');
    }

    const effectiveRoles = user.roles?.length ? user.roles : user.role ? [user.role] : [];
    const isAdminLike = effectiveRoles.some((r) => r === 'admin' || r === 'command-center');
    const isTenant = effectiveRoles.includes('tenant');
    const isProvider = effectiveRoles.includes('provider');

    if (isAdminLike) {
      return this.ticketActionsService.listHistoryByTicketId(requestId);
    }
    if (isTenant && (ticket.tenantId === user.id || ticket.userId === user.id)) {
      return this.ticketActionsService.listHistoryByTicketId(requestId);
    }
    if (isProvider && ticket.vendorId === user.id) {
      return this.ticketActionsService.listHistoryByTicketId(requestId);
    }

    throw new ForbiddenException('Not allowed to read action history for this request');
  }

  /**
   * Append-only: records `ESCALATE` on the ticket. Does not mutate `UnifiedRequest` state.
   */
  async appendEscalationAction(
    ticketId: string,
    user: AuthenticatedUser,
    dto: EscalateRequestDto,
  ): Promise<TicketAction> {
    const effectiveRoles = user.roles?.length ? user.roles : user.role ? [user.role] : [];
    const canEscalate = effectiveRoles.some((r) => r === 'admin' || r === 'command-center');
    if (!canEscalate) {
      throw new ForbiddenException('Only admin or command-center can escalate');
    }

    const ticket = await this.prisma.unifiedRequest.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });
    if (!ticket) {
      throw new NotFoundException('Request not found');
    }

    const payload: Record<string, unknown> = { reason: dto.reason };
    if (dto.level !== undefined && dto.level !== '') payload.level = dto.level;
    if (dto.target !== undefined && dto.target !== '') payload.target = dto.target;
    if (dto.references && dto.references.length > 0) payload.references = dto.references;

    const actorType = effectiveRoles.includes('admin')
      ? 'admin'
      : effectiveRoles.includes('command-center')
        ? 'command-center'
        : user.role;

    return this.ticketActionsService.createAction({
      ticketId,
      actionType: 'ESCALATE',
      actorType,
      actorId: user.id,
      payload: this.toJson(payload),
    });
  }

  /**
   * Append-only: records `ASSIGN` (vendor chosen). Caller keeps existing `UnifiedRequest` update + gateway emit.
   */
  async appendAssignTicketAction(
    ticketId: string,
    user: AuthenticatedUser,
    dto: AssignVendorDto,
  ): Promise<TicketAction> {
    const effectiveRoles = user.roles?.length ? user.roles : user.role ? [user.role] : [];
    const canAssign = effectiveRoles.some((r) => r === 'admin' || r === 'command-center');
    if (!canAssign) {
      throw new ForbiddenException('Only admin or command-center can assign');
    }

    const actorType = effectiveRoles.includes('admin')
      ? 'admin'
      : effectiveRoles.includes('command-center')
        ? 'command-center'
        : user.role;

    return this.ticketActionsService.createAction({
      ticketId,
      actionType: 'ASSIGN',
      actorType,
      actorId: user.id,
      payload: this.toJson({ vendorId: dto.vendorId }),
    });
  }

  async changeUnifiedRequestPriority(
    requestId: string,
    user: AuthenticatedUser,
    dto: ChangeUnifiedRequestPriorityDto,
  ) {
    const effectiveRoles = user.roles?.length ? user.roles : user.role ? [user.role] : [];
    const canChange = effectiveRoles.some((r) => r === 'admin' || r === 'command-center');
    if (!canChange) {
      throw new ForbiddenException('Only admin or command-center can change priority');
    }

    const existing = await this.prisma.unifiedRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        priority: true,
        tenantId: true,
        vendorId: true,
        requestType: true,
        status: true,
        propertyIds: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!existing) {
      throw new NotFoundException('Request not found');
    }

    const fromPriority = existing.priority;
    if (fromPriority === dto.to) {
      throw new BadRequestException('Priority is already set to this value');
    }

    const updated = await this.prisma.unifiedRequest.update({
      where: { id: requestId },
      data: { priority: dto.to as RequestPriority },
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
      { request: minimal, changedFields: ['priority'] },
    );

    void this.appendPriorityChangeTicketAction(requestId, user, fromPriority, dto.to).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown logging error';
      console.warn(`TicketAction PRIORITY_CHANGE failed: ${message}`);
    });

    return minimal;
  }

  private async appendPriorityChangeTicketAction(
    ticketId: string,
    user: AuthenticatedUser,
    from: RequestPriority,
    to: RequestPriority,
  ): Promise<TicketAction> {
    const effectiveRoles = user.roles?.length ? user.roles : user.role ? [user.role] : [];
    const actorType = effectiveRoles.includes('admin')
      ? 'admin'
      : effectiveRoles.includes('command-center')
        ? 'command-center'
        : user.role;

    return this.ticketActionsService.createAction({
      ticketId,
      actionType: 'PRIORITY_CHANGE',
      actorType,
      actorId: user.id,
      payload: this.toJson({ from, to }),
    });
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
        // Phase 2: hardcoded geo; replace with config/property-based resolution in later phase.
        country: 'QA',
        city: 'Doha',
        propertyIds: dto.propertyIds ?? [],
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

  async assignVendor(requestId: string, dto: AssignVendorDto, user: AuthenticatedUser) {
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
    void this.appendAssignTicketAction(requestId, user, dto).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown logging error';
      console.warn(`TicketAction ASSIGN failed: ${message}`);
    });
    return minimal;
  }

  async updateUnifiedRequestStatusCommandCenter(
    requestId: string,
    user: AuthenticatedUser,
    dto: UpdateRealtimeRequestStatusDto,
  ) {
    const effectiveRoles = user.roles?.length ? user.roles : user.role ? [user.role] : [];
    const allowed = effectiveRoles.some((r) => r === 'admin' || r === 'command-center');
    if (!allowed) {
      throw new ForbiddenException('Only admin or command-center can update status here');
    }

    const existing = await this.prisma.unifiedRequest.findUniqueOrThrow({
      where: { id: requestId },
      select: {
        id: true,
        vendorId: true,
        status: true,
        tenantId: true,
        requestType: true,
        propertyIds: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const current = this.toMinimalStatus(existing.status);
    const isValidTransition = (
      (current === 'assigned' && dto.status === 'in_progress')
      || (current === 'in_progress' && dto.status === 'completed')
    );
    if (!isValidTransition) {
      throw new BadRequestException(`Invalid status transition: ${current} -> ${dto.status}`);
    }

    const updated = await this.prisma.unifiedRequest.update({
      where: { id: requestId },
      data: {
        status: this.fromMinimalStatus(dto.status),
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

    void this.appendStatusUpdateTicketAction(requestId, user, current, dto.status).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown logging error';
      console.warn(`TicketAction STATUS_UPDATE failed: ${message}`);
    });
    return minimal;
  }

  private async appendStatusUpdateTicketAction(
    ticketId: string,
    user: AuthenticatedUser,
    from: string,
    to: string,
  ): Promise<TicketAction> {
    const effectiveRoles = user.roles?.length ? user.roles : user.role ? [user.role] : [];
    const actorType = effectiveRoles.includes('admin')
      ? 'admin'
      : effectiveRoles.includes('command-center')
        ? 'command-center'
        : user.role;

    return this.ticketActionsService.createAction({
      ticketId,
      actionType: 'STATUS_UPDATE',
      actorType,
      actorId: user.id,
      payload: this.toJson({ from, to }),
    });
  }

  async updateRealtimeStatus(requestId: string, vendorId: string, dto: UpdateRealtimeRequestStatusDto) {
    const existing = await this.prisma.unifiedRequest.findUniqueOrThrow({
      where: { id: requestId },
      select: { id: true, vendorId: true, status: true },
    });

    if (!existing.vendorId || existing.vendorId !== vendorId) {
      throw new ForbiddenException('Request is not assigned to this vendor');
    }

    const current = this.toMinimalStatus(existing.status);
    const isValidTransition = (
      (current === 'assigned' && dto.status === 'in_progress')
      || (current === 'in_progress' && dto.status === 'completed')
    );
    if (!isValidTransition) {
      throw new BadRequestException(`Invalid status transition: ${current} -> ${dto.status}`);
    }

    const updated = await this.prisma.unifiedRequest.update({
      where: { id: requestId },
      data: {
        status: this.fromMinimalStatus(dto.status),
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
    this.logTicketActionNoThrow({
      ticketId: requestId,
      actionType: 'CHANGE_STATUS',
      actorType: 'provider',
      actorId: vendorId,
      payload: {
        fromStatus: current,
        toStatus: dto.status,
      },
    });
    return minimal;
  }

  private logTicketActionNoThrow(input: {
    ticketId: string;
    actionType: string;
    actorType: string;
    actorId: string;
    payload?: Prisma.InputJsonValue;
  }) {
    void this.ticketActionsService.createAction(input).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown logging error';
      console.warn(`TicketAction logging failed: ${message}`);
    });
  }

  private toMinimalRequest(request: {
    id: string;
    tenantId: string;
    vendorId: string | null;
    requestType: string;
    status: UnifiedRequestStatus;
    priority: RequestPriority;
    propertyIds: string[];
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: request.id,
      tenantId: request.tenantId,
      vendorId: request.vendorId ?? undefined,
      type: request.requestType,
      status: this.toMinimalStatus(request.status),
      priority: request.priority,
      propertyIds: request.propertyIds ?? [],
      primaryPropertyId: request.propertyIds?.[0],
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