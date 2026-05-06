/**
 * A1.7 — Pure execution-site resolution for UnifiedRequest (no Nest, no Prisma).
 * Single definition for Command Center suitability and orchestrator observability / future routing.
 */

/** Where suitability / routing city filter prefers request.city, else first linked property. */
export function computeSuitabilityFilterCity(
  row: { city: string; propertyIds: string[] },
  propertyCityById: ReadonlyMap<string, string>,
): string | null {
  const fromRequest = typeof row.city === 'string' ? row.city.trim() : '';
  if (fromRequest) return fromRequest;
  const firstPid = row.propertyIds?.[0];
  if (typeof firstPid !== 'string' || !firstPid.trim()) return null;
  const fromProperty = propertyCityById.get(firstPid.trim());
  return typeof fromProperty === 'string' && fromProperty.trim() ? fromProperty.trim() : null;
}

/**
 * Execution site is where the service will be performed (typically the asset / property).
 * It is NOT the tenant’s live location (`currentLat` / `currentLng`): those may be used elsewhere
 * for pickup UX or map display, but must not drive dispatch distance for property-scoped work.
 *
 * Property coordinates are the default anchor when the unified request is tied to `propertyIds`
 * and explicit `targetLat`/`targetLng` are absent (e.g. viewing with a shortlist — first property).
 *
 * Pickup / dropoff are route endpoints for airport-style services only; they are not a fallback
 * for generic property maintenance/viewing flows.
 */
export type UnifiedRequestExecutionSiteSource =
  | 'request-target'
  | 'property'
  | 'pickup'
  | 'dropoff'
  | 'request-city-only'
  | 'unavailable';

export type UnifiedRequestExecutionSite = {
  /** City string used for existing suitability city filter (request.city, else first property city). */
  city: string | null;
  lat: number | null;
  lng: number | null;
  source: UnifiedRequestExecutionSiteSource;
  reason: string;
};

function readFiniteCoordPair(
  lat: number | null | undefined,
  lng: number | null | undefined,
): { lat: number; lng: number } | null {
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { lat, lng };
}

function isAirportTransferStyleService(serviceType: string): boolean {
  return serviceType.trim().toLowerCase() === 'airport-transfer';
}

export function resolveUnifiedRequestExecutionSite(input: {
  city: string;
  propertyIds: string[];
  targetLat: number | null | undefined;
  targetLng: number | null | undefined;
  pickupLat: number | null | undefined;
  pickupLng: number | null | undefined;
  dropoffLat: number | null | undefined;
  dropoffLng: number | null | undefined;
  serviceType: string;
  propertyCityById: ReadonlyMap<string, string>;
  propertyLatLngById: ReadonlyMap<string, { lat: number; lng: number }>;
}): UnifiedRequestExecutionSite {
  const city = computeSuitabilityFilterCity(
    { city: input.city, propertyIds: input.propertyIds ?? [] },
    input.propertyCityById,
  );

  const targetPair = readFiniteCoordPair(input.targetLat, input.targetLng);
  if (targetPair) {
    return {
      city,
      lat: targetPair.lat,
      lng: targetPair.lng,
      source: 'request-target',
      reason: 'Explicit request target coordinates (service execution site on the ticket).',
    };
  }

  const firstPid = input.propertyIds?.[0];
  if (typeof firstPid === 'string' && firstPid.trim()) {
    const propLoc = input.propertyLatLngById.get(firstPid.trim());
    if (propLoc) {
      return {
        city,
        lat: propLoc.lat,
        lng: propLoc.lng,
        source: 'property',
        reason: 'First linked property coordinates (default anchor for property-scoped execution).',
      };
    }
  }

  if (isAirportTransferStyleService(input.serviceType)) {
    const pickup = readFiniteCoordPair(input.pickupLat, input.pickupLng);
    if (pickup) {
      return {
        city,
        lat: pickup.lat,
        lng: pickup.lng,
        source: 'pickup',
        reason: 'Airport-transfer execution anchor: pickup endpoint (no property / target coords).',
      };
    }
    const dropoff = readFiniteCoordPair(input.dropoffLat, input.dropoffLng);
    if (dropoff) {
      return {
        city,
        lat: dropoff.lat,
        lng: dropoff.lng,
        source: 'dropoff',
        reason: 'Airport-transfer execution anchor: dropoff endpoint (pickup unavailable).',
      };
    }
  }

  if (city) {
    return {
      city,
      lat: null,
      lng: null,
      source: 'request-city-only',
      reason: 'City known from request or first property, but no execution coordinates resolved.',
    };
  }

  return {
    city: null,
    lat: null,
    lng: null,
    source: 'unavailable',
    reason: 'No target, property, transfer endpoint, or city available for execution site.',
  };
}
