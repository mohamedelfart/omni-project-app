import { apiRequest } from './api-client';

export type ViewingShortlistItem = {
  id: string;
  propertyId: string;
  position: number;
  property: {
    id: string;
    title: string;
    city: string;
    district?: string | null;
    monthlyRentMinor: number;
    bedrooms: number;
    areaSqm: number;
  };
};

export type ViewingShortlist = {
  id: string;
  userId: string;
  isActive: boolean;
  items: ViewingShortlistItem[];
};

export type ViewingRequestPayload = {
  preferredDateISO: string;
  pickupLat: number;
  pickupLng: number;
  notes?: string;
};

export type ViewingRequest = {
  id: string;
  status: string;
  selectedPropertyIds: string[];
  assignment?: {
    providerId: string;
    status: string;
    etaMinutes?: number | null;
    provider?: {
      id: string;
      name: string;
      city?: string | null;
    };
  } | null;
  unifiedRequest: {
    id: string;
    status: string;
    country: string;
    city: string;
    propertyIds: string[];
    vendorId?: string | null;
    metadata?: {
      ticketCode?: string;
      locationLabel?: string;
      preferredDateISO?: string;
    };
    trackingEvents?: Array<{
      id: string;
      title: string;
      description?: string | null;
      status: string;
      createdAt: string;
    }>;
  };
  items: Array<{
    property: {
      id: string;
      title: string;
      city: string;
      district?: string | null;
      monthlyRentMinor: number;
      bedrooms: number;
      areaSqm: number;
    };
    stopOrder: number;
  }>;
};

export type PropertySearchResult = {
  id: string;
  title: string;
  city: string;
  district?: string | null;
  monthlyRentMinor: number;
  bedrooms: number;
  areaSqm: number;
  description: string;
  addressLine1?: string | null;
  lat?: number | null;
  lng?: number | null;
  countryCode?: string | null;
  media?: Array<{
    id: string;
    url: string;
    isPrimary?: boolean;
  }>;
};

export function listProperties() {
  return apiRequest<PropertySearchResult[]>('/properties');
}

export function getPropertyById(propertyId: string) {
  return apiRequest<PropertySearchResult>(`/properties/${propertyId}`);
}

export function getShortlist() {
  return apiRequest<ViewingShortlist>('/viewing/shortlist');
}

export function addToShortlist(propertyId: string) {
  return apiRequest('/viewing/shortlist/' + propertyId, {
    method: 'POST',
  });
}

export function removeFromShortlist(propertyId: string) {
  return apiRequest<ViewingShortlist>('/viewing/shortlist/' + propertyId, {
    method: 'DELETE',
  });
}

export function createViewingRequest(payload: ViewingRequestPayload) {
  return apiRequest<ViewingRequest>('/viewing/requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getViewingRequestById(requestId: string) {
  return apiRequest<ViewingRequest>('/viewing/requests/' + requestId);
}

export function listViewingRequests() {
  return apiRequest<ViewingRequest[]>('/viewing/requests');
}

export function confirmViewingProperty(requestId: string, propertyId: string) {
  return apiRequest<ViewingRequest & { nextStep: string; confirmedPropertyId: string }>(`/viewing/requests/${requestId}/confirm-property`, {
    method: 'POST',
    body: JSON.stringify({ propertyId }),
  });
}