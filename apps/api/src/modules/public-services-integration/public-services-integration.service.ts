import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { PrismaService } from '../prisma/prisma.service';
import { UnifiedRequestsService } from '../unified-requests/unified-requests.service';

type PublicServiceType =
  | 'address-verification'
  | 'residency-registration'
  | 'lease-validation'
  | 'municipality-request'
  | 'utilities-integration';

type PublicServiceAdapter = {
  authorityKey: string;
  serviceType: PublicServiceType;
  dispatch: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

@Injectable()
export class PublicServicesIntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unifiedRequestsService: UnifiedRequestsService,
    private readonly auditTrailService: AuditTrailService,
    private readonly configService: ConfigService,
  ) {}

  private get integrationEnabled() {
    return this.configService.get<string>('PUBLIC_SERVICES_INTEGRATION_ENABLED') === 'true';
  }

  private readonly adapters: Record<string, PublicServiceAdapter> = {
    'address-verification': {
      authorityKey: 'municipality-address-registry',
      serviceType: 'address-verification',
      dispatch: async (payload) => ({ accepted: true, authorityRef: `addr_${Date.now()}`, payload }),
    },
    'residency-registration': {
      authorityKey: 'residency-services',
      serviceType: 'residency-registration',
      dispatch: async (payload) => ({ accepted: true, authorityRef: `res_${Date.now()}`, payload }),
    },
    'lease-validation': {
      authorityKey: 'lease-validation-office',
      serviceType: 'lease-validation',
      dispatch: async (payload) => ({ accepted: true, authorityRef: `lease_${Date.now()}`, payload }),
    },
    'municipality-request': {
      authorityKey: 'municipality-services',
      serviceType: 'municipality-request',
      dispatch: async (payload) => ({ accepted: true, authorityRef: `mun_${Date.now()}`, payload }),
    },
    'utilities-integration': {
      authorityKey: 'utilities-gateway',
      serviceType: 'utilities-integration',
      dispatch: async (payload) => ({ accepted: true, authorityRef: `util_${Date.now()}`, payload }),
    },
  };

  private getAdapter(serviceType: string) {
    const adapter = this.adapters[serviceType];
    if (!adapter) {
      throw new BadRequestException('Unsupported public service type');
    }
    return adapter;
  }

  async createRequest(userId: string, payload: {
    serviceType: PublicServiceType;
    countryCode: string;
    city: string;
    assetId?: string;
    requiresConsent: boolean;
    consentAccepted: boolean;
    authorityCode?: string;
    data: Record<string, unknown>;
  }) {
    if (payload.requiresConsent && !payload.consentAccepted) {
      throw new BadRequestException('Consent is required before submitting public service requests');
    }

    const adapter = this.getAdapter(payload.serviceType);
    const unifiedRequest = await this.unifiedRequestsService.create(userId, {
      requestType: 'public-service',
      serviceType: `public-${payload.serviceType}`,
      country: payload.countryCode,
      city: payload.city,
      propertyIds: payload.assetId ? [payload.assetId] : [],
      metadata: {
        serviceType: payload.serviceType,
        authorityCode: payload.authorityCode ?? adapter.authorityKey,
        approvalStatus: 'PENDING_REVIEW',
        consentAccepted: payload.consentAccepted,
        requiresConsent: payload.requiresConsent,
        publicServicePayload: payload.data,
        integrationEnabled: this.integrationEnabled,
      },
    });

    await this.auditTrailService.write({
      actorUserId: userId,
      action: 'PUBLIC_SERVICE_REQUEST_CREATED',
      entity: 'UnifiedRequest',
      entityId: unifiedRequest.id,
      countryCode: payload.countryCode,
      metadata: {
        serviceType: payload.serviceType,
        authorityCode: payload.authorityCode ?? adapter.authorityKey,
        consentAccepted: payload.consentAccepted,
      },
    });

    return {
      requestId: unifiedRequest.id,
      serviceType: payload.serviceType,
      approvalStatus: 'PENDING_REVIEW',
      integrationEnabled: this.integrationEnabled,
      adapter: adapter.authorityKey,
    };
  }

  listRequests(filters?: { countryCode?: string; serviceType?: string; assetId?: string; status?: string }) {
    return this.prisma.unifiedRequest.findMany({
      where: {
        requestType: 'public-service',
        country: filters?.countryCode,
        serviceType: filters?.serviceType ? `public-${filters.serviceType}` : undefined,
        propertyIds: filters?.assetId ? { has: filters.assetId } : undefined,
        status: filters?.status as never,
      },
      include: { trackingEvents: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveRequest(adminUserId: string, requestId: string) {
    const request = await this.prisma.unifiedRequest.findUniqueOrThrow({ where: { id: requestId } });
    const metadata = request.metadata && typeof request.metadata === 'object'
      ? (request.metadata as Record<string, unknown>)
      : {};
    const serviceType = String(metadata.serviceType ?? '').trim();
    const adapter = this.getAdapter(serviceType);

    const dispatchResult = this.integrationEnabled
      ? await adapter.dispatch((metadata.publicServicePayload as Record<string, unknown>) ?? {})
      : {
        accepted: false,
        authorityRef: null,
        disabledReason: 'PUBLIC_SERVICES_INTEGRATION_ENABLED is false',
      };

    const updatedRequest = await this.prisma.unifiedRequest.update({
      where: { id: requestId },
      data: {
        status: this.integrationEnabled ? 'IN_PROGRESS' : 'UNDER_REVIEW',
        metadata: JSON.parse(JSON.stringify({
          ...metadata,
          approvalStatus: 'APPROVED',
          adapter: adapter.authorityKey,
          dispatchResult,
        })),
      },
    });

    await this.prisma.unifiedRequestTrackingEvent.create({
      data: {
        unifiedRequestId: requestId,
        actorUserId: adminUserId,
        actorType: 'command-center',
        title: 'Public service request approved',
        description: this.integrationEnabled
          ? `Dispatched through ${adapter.authorityKey}.`
          : 'Approved for future dispatch. External integration currently disabled.',
        status: updatedRequest.status,
        metadata: JSON.parse(JSON.stringify(dispatchResult)),
      },
    });

    await this.auditTrailService.write({
      actorUserId: adminUserId,
      action: 'PUBLIC_SERVICE_REQUEST_APPROVED',
      entity: 'UnifiedRequest',
      entityId: requestId,
      countryCode: request.country,
      metadata: {
        adapter: adapter.authorityKey,
        integrationEnabled: this.integrationEnabled,
        dispatchResult,
      },
    });

    return {
      requestId,
      status: updatedRequest.status,
      approvalStatus: 'APPROVED',
      dispatchResult,
    };
  }
}