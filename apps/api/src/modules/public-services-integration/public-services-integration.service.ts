import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import {
  NormalizedProviderDispatchResponse,
  NormalizedPublicServiceRequest,
} from '../integration-hub/integration-contracts';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
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
  dispatch: (payload: NormalizedPublicServiceRequest) => Promise<NormalizedProviderDispatchResponse>;
};

@Injectable()
export class PublicServicesIntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unifiedRequestsService: UnifiedRequestsService,
    private readonly orchestratorService: OrchestratorService,
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
      dispatch: async (payload) => ({ accepted: true, providerReference: `addr_${Date.now()}`, providerStatus: 'ACCEPTED', rawStatus: 'ACCEPTED', raw: payload }),
    },
    'residency-registration': {
      authorityKey: 'residency-services',
      serviceType: 'residency-registration',
      dispatch: async (payload) => ({ accepted: true, providerReference: `res_${Date.now()}`, providerStatus: 'ACCEPTED', rawStatus: 'ACCEPTED', raw: payload }),
    },
    'lease-validation': {
      authorityKey: 'lease-validation-office',
      serviceType: 'lease-validation',
      dispatch: async (payload) => ({ accepted: true, providerReference: `lease_${Date.now()}`, providerStatus: 'ACCEPTED', rawStatus: 'ACCEPTED', raw: payload }),
    },
    'municipality-request': {
      authorityKey: 'municipality-services',
      serviceType: 'municipality-request',
      dispatch: async (payload) => ({ accepted: true, providerReference: `mun_${Date.now()}`, providerStatus: 'ACCEPTED', rawStatus: 'ACCEPTED', raw: payload }),
    },
    'utilities-integration': {
      authorityKey: 'utilities-gateway',
      serviceType: 'utilities-integration',
      dispatch: async (payload) => ({ accepted: true, providerReference: `util_${Date.now()}`, providerStatus: 'ACCEPTED', rawStatus: 'ACCEPTED', raw: payload }),
    },
  };

  private toNormalizedPublicServiceRequest(params: {
    requestId: string;
    providerId: string;
    countryCode: string;
    city: string;
    serviceType: PublicServiceType;
    authorityCode: string;
    payload: Record<string, unknown>;
  }): NormalizedPublicServiceRequest {
    return {
      requestType: 'public-service',
      requestId: params.requestId,
      providerId: params.providerId,
      countryCode: params.countryCode,
      city: params.city,
      serviceType: `public-${params.serviceType}`,
      requestedAt: new Date().toISOString(),
      metadata: {
        publicServicePayload: params.payload,
      },
      authorityCode: params.authorityCode,
    };
  }

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

    const normalizedRequest = this.toNormalizedPublicServiceRequest({
      requestId,
      providerId: request.vendorId ?? 'public-services-authority',
      countryCode: request.country,
      city: request.city,
      serviceType: adapter.serviceType,
      authorityCode: adapter.authorityKey,
      payload: (metadata.publicServicePayload as Record<string, unknown>) ?? {},
    });

    const dispatchResult = this.integrationEnabled
      ? await adapter.dispatch(normalizedRequest)
      : {
        accepted: false,
        providerReference: null,
        providerStatus: 'DISABLED',
        rawStatus: 'DISABLED',
        message: 'PUBLIC_SERVICES_INTEGRATION_ENABLED is false',
        raw: normalizedRequest,
      };

    const updatedRequest = await this.orchestratorService.approvePublicServiceRequest({
      requestId,
      actorUserId: adminUserId,
      approvalStatus: 'APPROVED',
      integrationEnabled: this.integrationEnabled,
      adapterKey: adapter.authorityKey,
      dispatchResult,
      metadataPatch: {
        approvalStatus: 'APPROVED',
        adapter: adapter.authorityKey,
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