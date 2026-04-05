import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OperatorPolicyService } from '../operator-policy/operator-policy.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { AdapterRegistryService } from './adapter-registry.service';
import {
  NormalizedIntegrationRequest,
  NormalizedProviderDispatchResponse,
  inferIntegrationDomain,
  mapServiceTypeToNormalizedRequestType,
  normalizeProviderStatus,
} from './integration-contracts';

@Injectable()
export class IntegrationHubService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditTrailService: AuditTrailService,
    private readonly operatorPolicyService: OperatorPolicyService,
    private readonly adapterRegistryService: AdapterRegistryService,
  ) {}

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
  }

  private toRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }

  private normalizeRequestShape(params: {
    request: {
      id: string;
      vendorId: string | null;
      country: string;
      city: string;
      serviceType: string;
      createdAt: Date;
      pickupLat: number | null;
      pickupLng: number | null;
      dropoffLat: number | null;
      dropoffLng: number | null;
      locationLabel?: string | null;
      destinationLabel?: string | null;
      metadata: unknown;
    };
  }): NormalizedIntegrationRequest | null {
    const { request } = params;
    if (!request.vendorId) {
      return null;
    }

    const metadata = this.toRecord(request.metadata);
    const requestType = mapServiceTypeToNormalizedRequestType(request.serviceType);
    const base = {
      requestId: request.id,
      providerId: request.vendorId,
      countryCode: request.country,
      city: request.city,
      serviceType: request.serviceType,
      requestedAt: request.createdAt.toISOString(),
      pickup: {
        lat: request.pickupLat,
        lng: request.pickupLng,
        label: request.locationLabel,
      },
      dropoff: {
        lat: request.dropoffLat,
        lng: request.dropoffLng,
        label: request.destinationLabel,
      },
      metadata,
    };

    if (requestType === 'transport') {
      const stops = Array.isArray(metadata.properties) ? metadata.properties.length : 0;
      return {
        ...base,
        requestType: 'transport',
        itineraryType: stops > 1 ? 'multi-stop' : 'single-leg',
      };
    }

    if (requestType === 'delivery') {
      return {
        ...base,
        requestType: 'delivery',
        deliveryClass: 'other',
      };
    }

    if (requestType === 'stay') {
      return {
        ...base,
        requestType: 'stay',
        stayCategory: 'other',
      };
    }

    if (requestType === 'commerce') {
      return {
        ...base,
        requestType: 'commerce',
        commerceCategory: 'other',
      };
    }

    if (requestType === 'public-service') {
      return {
        ...base,
        requestType: 'public-service',
        authorityCode: typeof metadata.authorityCode === 'string' ? metadata.authorityCode : undefined,
      };
    }

    return {
      ...base,
      requestType: 'country-specific',
      countryServiceKey: `${request.country}:${request.serviceType}`,
    };
  }

  private normalizeDispatchResponse(
    rawResponse: Record<string, unknown>,
  ): NormalizedProviderDispatchResponse {
    const accepted = Boolean(rawResponse.accepted ?? false);
    const providerReference = typeof rawResponse.authorityRef === 'string'
      ? rawResponse.authorityRef
      : (typeof rawResponse.providerReference === 'string' ? rawResponse.providerReference : null);
    const providerStatus = typeof rawResponse.providerStatus === 'string' ? rawResponse.providerStatus : null;

    return {
      accepted,
      providerReference,
      providerStatus,
      rawStatus: providerStatus,
      message: typeof rawResponse.message === 'string' ? rawResponse.message : undefined,
      raw: rawResponse,
    };
  }

  private async simulateProviderDispatch(params: {
    adapterKey: string;
    normalizedRequest: NormalizedIntegrationRequest;
    delayMs: number;
    lifecycle: string[];
  }) {
    const startedAt = Date.now();
    const safeDelay = Math.max(0, Math.min(params.delayMs, 350));
    if (safeDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, safeDelay));
    }

    return this.normalizeDispatchResponse({
      accepted: true,
      providerReference: `sim_${params.adapterKey.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
      providerStatus: params.lifecycle[0] ?? 'ASSIGNED',
      rawStatus: params.lifecycle[0] ?? 'ASSIGNED',
      message: 'Simulated provider dispatch executed by Integration Hub',
      raw: {
        simulation: true,
        adapterKey: params.adapterKey,
        lifecycle: params.lifecycle,
        simulatedDelayMs: safeDelay,
        elapsedMs: Date.now() - startedAt,
        requestType: params.normalizedRequest.requestType,
      },
    });
  }

  normalizeInboundProviderStatus(status: string, note?: string) {
    const mapped = normalizeProviderStatus(status);
    return {
      ...mapped,
      actorEventDescription: note ?? mapped.actorEventDescription,
    };
  }

  async dispatchToProviderAdapter(unifiedRequestId: string) {
    const request = await this.prisma.unifiedRequest.findUniqueOrThrow({ where: { id: unifiedRequestId } });
    const requestMetadata = this.toRecord(request.metadata);
    const serviceDispatchContext = this.toRecord(requestMetadata.serviceDispatchContext);

    if (!request.vendorId) {
      return { mode: 'core-only', dispatched: false, reason: 'No vendor assigned' };
    }

    const adapter = await this.prisma.adapterConfig.findFirst({
      where: {
        providerId: request.vendorId,
        isActive: true,
        OR: [{ serviceType: request.serviceType }, { serviceType: 'all' }],
      },
      orderBy: { createdAt: 'desc' },
    });

    const runtimePolicy = await this.operatorPolicyService.getRuntimePolicyContext(request.country);
    const integrationDomain = inferIntegrationDomain(request.serviceType);
    const normalizedRequest = this.normalizeRequestShape({ request });
    const normalizedContractType = mapServiceTypeToNormalizedRequestType(request.serviceType);
    const registryEntry = this.adapterRegistryService.resolve({
      serviceType: request.serviceType,
      countryCode: request.country,
      normalizedContractType,
    });

    const adapterEligibility = await this.operatorPolicyService.getAdapterEligibility({
      countryCode: request.country,
      serviceType: request.serviceType,
      adapterServiceType: adapter?.serviceType,
      adapterActive: adapter?.isActive,
    });

    const canSimulateDispatch = Boolean(normalizedRequest)
      && Boolean(registryEntry)
      && adapterEligibility.eligible;

    const simulatedDispatch = canSimulateDispatch && registryEntry && normalizedRequest
      ? await this.simulateProviderDispatch({
        adapterKey: registryEntry.adapterKey,
        normalizedRequest,
        delayMs: registryEntry.simulatedDelayMs,
        lifecycle: registryEntry.simulatedLifecycle,
      })
      : null;

    const normalizedDispatch = simulatedDispatch ?? this.normalizeDispatchResponse({
      accepted: Boolean(adapter),
      providerReference: adapter?.id,
      providerStatus: adapter ? 'ADAPTER_READY' : 'CORE_ONLY',
      message: adapter ? 'Adapter configured and selected (simulation unavailable)' : 'No adapter configured; Core provider flow retained',
    });

    const routeData = {
      mode: adapter ? 'provider-adapter' : 'core-only',
      adapterId: adapter?.id,
      adapterServiceType: adapter?.serviceType,
      endpoint: adapter?.endpoint,
      adapterKey: registryEntry?.adapterKey ?? null,
      adapterContractType: registryEntry?.contractType ?? null,
      integrationDomain,
      normalizedRequest,
      normalizedDispatch,
      simulatedDispatch,
      simulationMode: Boolean(simulatedDispatch),
      adapterEligibility,
      routingDecisionContext: {
        ...serviceDispatchContext,
        hasVendor: Boolean(request.vendorId),
        adapterConfigFound: Boolean(adapter),
        registryResolved: Boolean(registryEntry),
        policyEligible: adapterEligibility.eligible,
      },
      dispatchedAt: new Date().toISOString(),
    };

    await this.prisma.unifiedRequest.update({
      where: { id: request.id },
      data: {
        destination: adapter ? 'external-service' : 'provider',
        routeData: this.toJson(routeData),
      },
    });

    await this.prisma.unifiedRequestTrackingEvent.create({
      data: {
        unifiedRequestId: request.id,
        actorType: 'system',
        title: adapter ? 'Integration dispatched' : 'Core dispatch queued',
        description: adapter ? `Adapter ${adapter.id} selected for ${request.serviceType}` : 'No adapter configured, staying in core provider queue.',
        status: 'ASSIGNED',
      },
    });

    await this.auditTrailService.write({
      action: 'UNIFIED_REQUEST_INTEGRATION_ROUTED',
      entity: 'UnifiedRequest',
      entityId: request.id,
      countryCode: request.country,
      metadata: {
        ...routeData,
        policyContext: {
          selectedCountryCode: runtimePolicy.selectedCountryCode,
          selectedCountryStatus: runtimePolicy.selectedCountryStatus,
          routingPolicy: runtimePolicy.routingPolicy,
        },
      },
    });

    return { dispatched: true, ...routeData };
  }
}
