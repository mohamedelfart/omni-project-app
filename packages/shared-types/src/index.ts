export type AppLocale = 'en' | 'ar';

export type CountryCode =
  | 'QA'
  | 'AE'
  | 'SA'
  | 'BH'
  | 'KW'
  | 'OM'
  | 'EG'
  | 'GB'
  | 'US'
  | 'FR'
  | 'DE';

export type CurrencyCode =
  | 'QAR'
  | 'AED'
  | 'SAR'
  | 'BHD'
  | 'KWD'
  | 'OMR'
  | 'EGP'
  | 'GBP'
  | 'USD'
  | 'EUR';

export type UserRole = 'tenant' | 'landlord' | 'admin' | 'provider' | 'command-center';

export type RequestType =
  | 'property-viewing'
  | 'property-booking'
  | 'move-in'
  | 'maintenance'
  | 'cleaning'
  | 'airport-transfer'
  | 'ride-hailing'
  | 'food-delivery'
  | 'grocery'
  | 'laundry'
  | 'insurance'
  | 'offer'
  | 'community'
  | 'manual-intervention';

export type ServiceType =
  | 'viewing-transport'
  | 'move-in'
  | 'maintenance'
  | 'cleaning'
  | 'airport-transfer'
  | 'ride-hailing'
  | 'food-delivery'
  | 'grocery'
  | 'laundry'
  | 'utility-support'
  | 'insurance'
  | 'community';

export type UnifiedRequestStatus =
  | 'draft'
  | 'submitted'
  | 'under-review'
  | 'queued'
  | 'assigned'
  | 'en-route'
  | 'in-progress'
  | 'awaiting-payment'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'failed'
  | 'escalated';

export type CommandInstructionType =
  | 'approve'
  | 'reject'
  | 'modify'
  | 'assign-vendor'
  | 'reassign-vendor'
  | 'create-offer'
  | 'send-discount'
  | 'trigger-escalation'
  | 'update-status'
  | 'override-routing'
  | 'activate-fallback-vendor';

export interface Money {
  amountMinor: number;
  currency: CurrencyCode;
}

export interface GeoPoint {
  lat: number;
  lng: number;
  label?: string;
}

export interface GeoBounds {
  northEast: GeoPoint;
  southWest: GeoPoint;
}

export interface TrackingEvent {
  id: string;
  status: string;
  title: string;
  description?: string;
  actorType: 'tenant' | 'provider' | 'command-center' | 'system';
  actorId?: string;
  location?: GeoPoint;
  createdAt: string;
}

export interface TenantProfile {
  id: string;
  fullName: string;
  country: CountryCode;
  preferredLocale: AppLocale;
  currentLocation?: GeoPoint;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PropertySearchFilters {
  country?: CountryCode;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  furnished?: boolean;
  petFriendly?: boolean;
  nearPoint?: GeoPoint;
  bounds?: GeoBounds;
}

export interface RequestLocationPayload {
  currentLocation?: GeoPoint;
  targetLocation?: GeoPoint;
  pickupLocation?: GeoPoint;
  dropoffLocation?: GeoPoint;
  routePolyline?: string;
  etaMinutes?: number;
}

export interface UnifiedRequestPayload {
  requestId: string;
  userId: string;
  tenantId: string;
  requestType: RequestType;
  serviceType: ServiceType;
  source: 'tenant-app' | 'command-center' | 'provider-panel' | 'external-adapter' | 'system';
  destination: 'core' | 'command-center' | 'provider' | 'external-service' | 'tenant';
  country: CountryCode;
  city: string;
  propertyIds?: string[];
  preferredTime?: string;
  status: UnifiedRequestStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'critical';
  vendorId?: string;
  commandCenterStatus: 'visible' | 'action-required' | 'monitoring' | 'resolved';
  paymentStatus: 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded' | 'waived';
  notes?: string;
  metadata?: Record<string, unknown>;
  location?: RequestLocationPayload;
  trackingEvents: TrackingEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateViewingRequestDto {
  propertyIds: string[];
  preferredDateISO: string;
  pickupLocation: GeoPoint;
  notes?: string;
}

export interface CreateBookingDto {
  propertyId: string;
  moveInDateISO: string;
  termMonths: number;
  offerId?: string;
}

export interface CreatePaymentIntentDto {
  bookingId?: string;
  serviceOrderId?: string;
  unifiedRequestId?: string;
  amountMinor: number;
  currency: CurrencyCode;
}

export interface CommandCenterInstructionDto {
  requestId: string;
  instructionType: CommandInstructionType;
  target: 'tenant' | 'provider' | 'external-service';
  notes?: string;
  payload?: Record<string, unknown>;
}

export interface ProviderAssignmentDto {
  requestId: string;
  providerId: string;
  providerType: string;
  etaMinutes?: number;
  notes?: string;
}
