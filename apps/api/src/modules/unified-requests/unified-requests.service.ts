import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { CreateUnifiedRequestDto, DispatchInstructionDto } from './dto/unified-request.dto';

@Injectable()
export class UnifiedRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestratorService: OrchestratorService,
    private readonly auditTrailService: AuditTrailService,
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
}