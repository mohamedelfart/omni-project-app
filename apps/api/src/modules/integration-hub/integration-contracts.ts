export type IntegrationProviderDomain =
  | 'transport'
  | 'delivery'
  | 'stay'
  | 'commerce'
  | 'public-service'
  | 'country-specific';

export type IntegrationCoreStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'IN_PROGRESS'
  | 'AWAITING_PAYMENT'
  | 'COMPLETED'
  | 'FAILED';

export type IntegrationCommandCenterStatus =
  | 'MONITORING'
  | 'ACTION_REQUIRED'
  | 'RESOLVED'
  | 'ESCALATED';

type IntegrationRequestEnvelope = {
  requestId: string;
  providerId: string;
  countryCode: string;
  city?: string | null;
  serviceType: string;
  requestedAt: string;
  pickup?: {
    lat?: number | null;
    lng?: number | null;
    label?: string | null;
  };
  dropoff?: {
    lat?: number | null;
    lng?: number | null;
    label?: string | null;
  };
  metadata: Record<string, unknown>;
};

export type NormalizedTransportRequest = IntegrationRequestEnvelope & {
  requestType: 'transport';
  itineraryType: 'single-leg' | 'multi-stop';
};

export type NormalizedDeliveryRequest = IntegrationRequestEnvelope & {
  requestType: 'delivery';
  deliveryClass: 'parcel' | 'document' | 'food' | 'other';
};

export type NormalizedStayRequest = IntegrationRequestEnvelope & {
  requestType: 'stay';
  stayCategory: 'hotel' | 'serviced-apartment' | 'other';
};

export type NormalizedCommerceRequest = IntegrationRequestEnvelope & {
  requestType: 'commerce';
  commerceCategory: 'pharmacy' | 'grocery' | 'retail' | 'other';
};

export type NormalizedPublicServiceRequest = IntegrationRequestEnvelope & {
  requestType: 'public-service';
  authorityCode?: string;
};

export type NormalizedCountrySpecificRequest = IntegrationRequestEnvelope & {
  requestType: 'country-specific';
  countryServiceKey: string;
};

export type NormalizedIntegrationRequest =
  | NormalizedTransportRequest
  | NormalizedDeliveryRequest
  | NormalizedStayRequest
  | NormalizedCommerceRequest
  | NormalizedPublicServiceRequest
  | NormalizedCountrySpecificRequest;

export type NormalizedProviderDispatchResponse = {
  accepted: boolean;
  providerReference?: string | null;
  providerStatus?: string | null;
  rawStatus?: string | null;
  message?: string;
  raw: Record<string, unknown>;
};

export type NormalizedProviderStatusMapping = {
  coreStatus: IntegrationCoreStatus;
  commandCenterStatus: IntegrationCommandCenterStatus;
  actorEventTitle: string;
  actorEventDescription: string;
  auditAction: 'VENDOR_TICKET_STATUS_UPDATED';
};

export function inferIntegrationDomain(serviceType: string): IntegrationProviderDomain {
  if (serviceType === 'viewing-transport' || serviceType === 'move-in' || serviceType === 'airport-transfer') {
    return 'transport';
  }

  if (serviceType === 'maintenance' || serviceType === 'cleaning') {
    return 'delivery';
  }

  if (serviceType.startsWith('public-')) {
    return 'public-service';
  }

  return 'country-specific';
}

export function mapServiceTypeToNormalizedRequestType(
  serviceType: string,
): NormalizedIntegrationRequest['requestType'] {
  const domain = inferIntegrationDomain(serviceType);
  if (domain === 'transport') return 'transport';
  if (domain === 'delivery') return 'delivery';
  if (domain === 'stay') return 'stay';
  if (domain === 'commerce') return 'commerce';
  if (domain === 'public-service') return 'public-service';
  return 'country-specific';
}

export function normalizeProviderStatus(status: string): NormalizedProviderStatusMapping {
  const normalized = status.trim().toUpperCase().replace(/[\s-]+/g, '_');

  if (normalized === 'ACCEPTED' || normalized === 'ASSIGNED') {
    return {
      coreStatus: 'ASSIGNED',
      commandCenterStatus: 'MONITORING',
      actorEventTitle: 'Vendor accepted assignment',
      actorEventDescription: 'Assigned vendor accepted the service ticket.',
      auditAction: 'VENDOR_TICKET_STATUS_UPDATED',
    };
  }

  if (normalized === 'ON_THE_WAY' || normalized === 'EN_ROUTE') {
    return {
      coreStatus: 'EN_ROUTE',
      commandCenterStatus: 'MONITORING',
      actorEventTitle: 'Vendor on the way',
      actorEventDescription: 'Assigned vendor is travelling to service destination.',
      auditAction: 'VENDOR_TICKET_STATUS_UPDATED',
    };
  }

  if (normalized === 'ARRIVED' || normalized === 'IN_PROGRESS') {
    return {
      coreStatus: 'IN_PROGRESS',
      commandCenterStatus: 'MONITORING',
      actorEventTitle: 'Vendor arrived',
      actorEventDescription: 'Assigned vendor arrived and started service execution.',
      auditAction: 'VENDOR_TICKET_STATUS_UPDATED',
    };
  }

  if (normalized === 'COMPLETED') {
    return {
      coreStatus: 'COMPLETED',
      commandCenterStatus: 'RESOLVED',
      actorEventTitle: 'Service ticket completed',
      actorEventDescription: 'Assigned vendor completed the service ticket.',
      auditAction: 'VENDOR_TICKET_STATUS_UPDATED',
    };
  }

  return {
    coreStatus: 'UNDER_REVIEW',
    commandCenterStatus: 'ACTION_REQUIRED',
    actorEventTitle: 'Vendor status requires review',
    actorEventDescription: `Provider sent unsupported status: ${status}.`,
    auditAction: 'VENDOR_TICKET_STATUS_UPDATED',
  };
}