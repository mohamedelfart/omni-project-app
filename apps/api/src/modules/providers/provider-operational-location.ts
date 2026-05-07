/**
 * A1.7 Step 3B — operational read-model: prefer Provider dispatch base, fallback to profile live coords.
 * Read-only; used for suitability distance context and orchestrator geo shadow (no routing impact).
 */

export type ProviderOperationalGeoSource = 'dispatch-base' | 'provider-profile-fallback' | 'none';

export function parseFiniteCoordPair(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function resolveProviderOperationalLocation(input: {
  dispatchBaseLat?: unknown;
  dispatchBaseLng?: unknown;
  profileCurrentLat?: unknown;
  profileCurrentLng?: unknown;
}): { coords: { lat: number; lng: number } | null; source: ProviderOperationalGeoSource } {
  const dispatch = parseFiniteCoordPair(input.dispatchBaseLat, input.dispatchBaseLng);
  if (dispatch) {
    return { coords: dispatch, source: 'dispatch-base' };
  }
  const profile = parseFiniteCoordPair(input.profileCurrentLat, input.profileCurrentLng);
  if (profile) {
    return { coords: profile, source: 'provider-profile-fallback' };
  }
  return { coords: null, source: 'none' };
}
