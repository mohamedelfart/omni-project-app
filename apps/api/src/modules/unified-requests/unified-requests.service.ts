import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RequestPriority, UnifiedRequestStatus } from '@prisma/client';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { SlaPolicyService } from '../sla-policy/sla-policy.service';
import type { TicketAction } from '@quickrent/shared-types';
import { mapPersistedTicketActionToDomain } from '../ticket-actions/ticket-actions.mapper';
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
import { toOperationalReadModelStatus, withOperationalStatusReadModel } from './unified-request-operational-status';

@Injectable()
export class UnifiedRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestratorService: OrchestratorService,
    private readonly auditTrailService: AuditTrailService,
    private readonly unifiedRequestsGateway: UnifiedRequestsGateway,
    private readonly ticketActionsService: TicketActionsService,
    private readonly slaPolicyService: SlaPolicyService,
  ) {}

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
  }

  private async providerIdsForUser(userId: string): Promise<string[]> {
    const profiles = await this.prisma.providerProfile.findMany({
      where: { userId },
      select: { providerId: true },
    });
    return profiles.map((profile) => profile.providerId);
  }

  private async providerUserRoomsForProviderId(providerId: string | null | undefined): Promise<string[]> {
    if (!providerId) {
      return [];
    }
    const profiles = await this.prisma.providerProfile.findMany({
      where: { providerId },
      select: { userId: true },
    });
    return profiles
      .map((profile) => profile.userId)
      .filter((userId): userId is string => typeof userId === 'string' && userId.length > 0)
      .map((userId) => `user:${userId}`);
  }

  async create(userId: string, dto: CreateUnifiedRequestDto) {
    const unifiedRequest = await this.prisma.$transaction(async (tx) => {
      const created = await tx.unifiedRequest.create({
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

      const resolved = await this.slaPolicyService.resolveSla(
        {
          countryCode: created.country,
          serviceType: created.serviceType,
          priority: created.priority,
          at: created.createdAt,
        },
        tx,
      );

      const baseMs = created.createdAt.getTime();
      return tx.unifiedRequest.update({
        where: { id: created.id },
        data: {
          slaPolicyRuleId: resolved.matchedRule?.id ?? null,
          responseDueAt: new Date(baseMs + resolved.responseSlaMinutes * 60_000),
          completionDueAt: new Date(baseMs + resolved.completionSlaMinutes * 60_000),
        },
        include: { trackingEvents: true },
      });
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

    const minimalForSocket = this.toMinimalRequest(unifiedRequest);
    this.unifiedRequestsGateway.emitToRooms(
      REQUEST_SOCKET_EVENTS.created,
      [`user:${minimalForSocket.tenantId}`, 'role:admin', 'role:command-center'],
      { request: minimalForSocket },
    );

    return { ...unifiedRequest, routing };
  }

  listAll() {
    return this.prisma.unifiedRequest.findMany({ include: { trackingEvents: true }, orderBy: { createdAt: 'desc' } });
  }

  listMine(userId: string) {
    return this.prisma.unifiedRequest
      .findMany({
        where: { tenantId: userId },
        include: { trackingEvents: true },
        orderBy: { createdAt: 'desc' },
      })
      .then((items) =>
        items.map((item) => ({
          ...item,
          status: toOperationalReadModelStatus(item.status),
        })),
      );
  }

  listRealtimeMine(userId: string) {
    return this.prisma.unifiedRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }).then((items) => items.map((item) => this.toMinimalRequest(item)));
  }

  getById(requestId: string, viewer?: AuthenticatedUser) {
    return this.prisma.unifiedRequest
      .findUniqueOrThrow({ where: { id: requestId }, include: { trackingEvents: true } })
      .then((row) => {
        if (viewer && this.isTenantLikeViewer(viewer)) {
          return withOperationalStatusReadModel(row);
        }
        return row;
      });
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
    if (isProvider) {
      const providerIds = await this.providerIdsForUser(user.id);
      const providerContextId = typeof user.providerContextId === 'string' ? user.providerContextId : null;
      const scopedProviderIds = providerContextId
        ? providerIds.includes(providerContextId)
          ? [providerContextId]
          : (() => {
              throw new ForbiddenException('Provider session context is invalid for current user');
            })()
        : providerIds;
      if (ticket.vendorId && scopedProviderIds.includes(ticket.vendorId)) {
        return this.ticketActionsService.listHistoryByTicketId(requestId);
      }
    }

    throw new ForbiddenException('Not allowed to read action history for this request');
  }

  /**
   * Records `ESCALATE` on the ticket (append-only action row) and bumps `UnifiedRequest.escalationLevel`
   * by one (capped at 5) so repeated manual escalations progress command-center severity.
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

    const payload: Record<string, unknown> = { reason: dto.reason };
    if (dto.level !== undefined && dto.level !== '') payload.level = dto.level;
    if (dto.target !== undefined && dto.target !== '') payload.target = dto.target;
    if (dto.references && dto.references.length > 0) payload.references = dto.references;

    const actorType = effectiveRoles.includes('admin')
      ? 'admin'
      : effectiveRoles.includes('command-center')
        ? 'command-center'
        : user.role;

    const payloadJson = this.toJson(payload);
    const auditMetadata: Record<string, unknown> = { reason: dto.reason };
    if (dto.level !== undefined && dto.level !== '') auditMetadata.level = dto.level;
    if (dto.target !== undefined && dto.target !== '') auditMetadata.target = dto.target;
    if (dto.references && dto.references.length > 0) auditMetadata.referencesCount = dto.references.length;

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.unifiedRequest.findUnique({
        where: { id: ticketId },
        select: { id: true, escalationLevel: true, country: true },
      });
      if (!existing) {
        throw new NotFoundException('Request not found');
      }

      const created = await tx.ticketAction.create({
        data: {
          ticketId,
          actionType: 'ESCALATE',
          actorType,
          actorId: user.id,
          payload: payloadJson,
        },
      });

      const priorLevel = existing.escalationLevel ?? 0;
      let nextLevel = priorLevel + 1;
      nextLevel = Math.min(nextLevel, 5);
      if (nextLevel > priorLevel) {
        await tx.unifiedRequest.update({
          where: { id: ticketId },
          data: { escalationLevel: nextLevel },
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: user.id || undefined,
          action: 'manual_escalation',
          entity: 'UnifiedRequest',
          entityId: ticketId,
          countryCode: existing.country,
          metadata: this.toJson(auditMetadata),
        },
      });

      return mapPersistedTicketActionToDomain(created);
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
    const providerRooms = await this.providerUserRoomsForProviderId(minimal.vendorId);
    this.unifiedRequestsGateway.emitToRooms(
      REQUEST_SOCKET_EVENTS.updated,
      [
        `user:${minimal.tenantId}`,
        ...providerRooms,
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
    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.unifiedRequest.create({
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

      const resolved = await this.slaPolicyService.resolveSla(
        {
          countryCode: row.country,
          serviceType: row.serviceType,
          priority: row.priority,
          at: row.createdAt,
        },
        tx,
      );

      const baseMs = row.createdAt.getTime();
      return tx.unifiedRequest.update({
        where: { id: row.id },
        data: {
          slaPolicyRuleId: resolved.matchedRule?.id ?? null,
          responseDueAt: new Date(baseMs + resolved.responseSlaMinutes * 60_000),
          completionDueAt: new Date(baseMs + resolved.completionSlaMinutes * 60_000),
        },
      });
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

  async listRealtimeForVendor(user: AuthenticatedUser) {
    const providerIds = await this.providerIdsForUser(user.id);
    if (!providerIds.length) {
      return [];
    }
    const providerContextId = typeof user.providerContextId === 'string' ? user.providerContextId : null;
    const scopedProviderIds = providerContextId
      ? providerIds.includes(providerContextId)
        ? [providerContextId]
        : (() => { throw new ForbiddenException('Provider session context is invalid for current user'); })()
      : providerIds;

    return this.prisma.unifiedRequest.findMany({
      where: { vendorId: { in: scopedProviderIds } },
      orderBy: { createdAt: 'desc' },
    }).then((items) => items.map((item) => this.toMinimalRequest(item)));
  }

  /**
   * Realtime fan-out after canonical provider assignment (shared by admin realtime + command-center).
   * Emits `request.assigned` then `request.updated` (existing client contract).
   */
  async emitProviderAssignmentSockets(
    unified: {
      id: string;
      tenantId: string;
      vendorId: string | null;
      requestType: string;
      status: UnifiedRequestStatus;
      priority: RequestPriority;
      propertyIds: string[];
      createdAt: Date;
      updatedAt: Date;
    },
    providerId: string,
  ): Promise<void> {
    const minimal = this.toMinimalRequest(unified);
    const providerRooms = await this.providerUserRoomsForProviderId(providerId);
    this.unifiedRequestsGateway.emitToRooms(
      REQUEST_SOCKET_EVENTS.assigned,
      [
        `user:${minimal.tenantId}`,
        ...providerRooms,
        'role:admin',
        'role:command-center',
      ],
      { request: minimal, vendorId: providerId },
    );
    this.unifiedRequestsGateway.emitToRooms(
      REQUEST_SOCKET_EVENTS.updated,
      [
        `user:${minimal.tenantId}`,
        ...providerRooms,
        'role:admin',
        'role:command-center',
      ],
      { requestId: minimal.id, status: minimal.status },
    );
  }

  async assignVendor(requestId: string, dto: AssignVendorDto, user: AuthenticatedUser) {
    const { changed, request } = await this.orchestratorService.assignProviderToUnifiedRequest({
      requestId,
      providerId: dto.vendorId,
      actorUserId: user.id,
    });

    const minimal = this.toMinimalRequest(request);
    if (changed) {
      void this.emitProviderAssignmentSockets(request, dto.vendorId);
      void this.appendAssignTicketAction(requestId, user, dto).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unknown logging error';
        console.warn(`TicketAction ASSIGN failed: ${message}`);
      });
    }
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
        firstResponseAt: true,
        completedAt: true,
      },
    });

    const current = toOperationalReadModelStatus(existing.status);
    const isValidTransition = (
      (current === 'assigned' && dto.status === 'in_progress')
      || (current === 'in_progress' && dto.status === 'completed')
    );
    if (!isValidTransition) {
      throw new BadRequestException(`Invalid status transition: ${current} -> ${dto.status}`);
    }

    const nextStatus = this.fromMinimalStatus(dto.status);
    const updated = await this.prisma.unifiedRequest.update({
      where: { id: requestId },
      data: {
        status: nextStatus,
        ...this.buildUnifiedRequestSlaTruthFields(nextStatus, {
          firstResponseAt: existing.firstResponseAt,
          completedAt: existing.completedAt,
        }),
      },
    });

    const minimal = this.toMinimalRequest(updated);
    const providerRooms = await this.providerUserRoomsForProviderId(minimal.vendorId);
    this.unifiedRequestsGateway.emitToRooms(
      REQUEST_SOCKET_EVENTS.updated,
      [
        `user:${minimal.tenantId}`,
        ...providerRooms,
        'role:admin',
        'role:command-center',
      ],
      { requestId: minimal.id, status: minimal.status },
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

  async updateRealtimeStatus(requestId: string, user: AuthenticatedUser, dto: UpdateRealtimeRequestStatusDto) {
    const providerIds = await this.providerIdsForUser(user.id);
    if (!providerIds.length) {
      throw new ForbiddenException('No provider profile attached to current user');
    }
    const providerContextId = typeof user.providerContextId === 'string' ? user.providerContextId : null;
    const scopedProviderIds = providerContextId
      ? providerIds.includes(providerContextId)
        ? [providerContextId]
        : (() => { throw new ForbiddenException('Provider session context is invalid for current user'); })()
      : providerIds;

    const existing = await this.prisma.unifiedRequest.findUniqueOrThrow({
      where: { id: requestId },
      select: { id: true, vendorId: true, status: true, firstResponseAt: true, completedAt: true },
    });

    if (!existing.vendorId || !scopedProviderIds.includes(existing.vendorId)) {
      throw new ForbiddenException('Request is not assigned to this vendor');
    }

    const current = toOperationalReadModelStatus(existing.status);
    const isValidTransition = (
      (current === 'assigned' && dto.status === 'in_progress')
      || (current === 'in_progress' && dto.status === 'completed')
    );
    if (!isValidTransition) {
      throw new BadRequestException(`Invalid status transition: ${current} -> ${dto.status}`);
    }

    const nextStatus = this.fromMinimalStatus(dto.status);
    const updated = await this.prisma.unifiedRequest.update({
      where: { id: requestId },
      data: {
        status: nextStatus,
        ...this.buildUnifiedRequestSlaTruthFields(nextStatus, {
          firstResponseAt: existing.firstResponseAt,
          completedAt: existing.completedAt,
        }),
      },
    });

    const minimal = this.toMinimalRequest(updated);
    const providerRooms = await this.providerUserRoomsForProviderId(minimal.vendorId);
    this.unifiedRequestsGateway.emitToRooms(
      REQUEST_SOCKET_EVENTS.updated,
      [
        `user:${minimal.tenantId}`,
        ...providerRooms,
        'role:admin',
        'role:command-center',
      ],
      { requestId: minimal.id, status: minimal.status },
    );
    this.logTicketActionNoThrow({
      ticketId: requestId,
      actionType: 'CHANGE_STATUS',
      actorType: 'provider',
      actorId: user.id,
      payload: {
        fromStatus: current,
        toStatus: dto.status,
        providerId: existing.vendorId,
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

  /**
   * Sets `firstResponseAt` / `completedAt` once when entering response-satisfied or completed states.
   * Does not overwrite existing timestamps (mirrors orchestrator SLA truth wiring).
   */
  private buildUnifiedRequestSlaTruthFields(
    nextStatus: UnifiedRequestStatus,
    existing: { firstResponseAt: Date | null; completedAt: Date | null },
  ): Pick<Prisma.UnifiedRequestUpdateInput, 'firstResponseAt' | 'completedAt'> {
    const now = new Date();
    const patch: Pick<Prisma.UnifiedRequestUpdateInput, 'firstResponseAt' | 'completedAt'> = {};
    const responseSatisfied =
      nextStatus === UnifiedRequestStatus.IN_PROGRESS
      || nextStatus === UnifiedRequestStatus.EN_ROUTE
      || nextStatus === UnifiedRequestStatus.COMPLETED;
    if (responseSatisfied && existing.firstResponseAt == null) {
      patch.firstResponseAt = now;
    }
    if (nextStatus === UnifiedRequestStatus.COMPLETED && existing.completedAt == null) {
      patch.completedAt = now;
    }
    return patch;
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
      status: toOperationalReadModelStatus(request.status),
      priority: request.priority,
      propertyIds: request.propertyIds ?? [],
      primaryPropertyId: request.propertyIds?.[0],
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }

  private isTenantLikeViewer(user: AuthenticatedUser): boolean {
    const roles = (user.roles?.length ? user.roles : user.role ? [user.role] : []).map((r) => String(r).toLowerCase());
    return roles.includes('tenant') || roles.includes('guest');
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