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

/**
 * Canonical dispatch-base write validation (A1.7 Step 3C).
 * Rejects non-finite pairs, out-of-range coordinates, and (0,0) null-island sentinel.
 */
export function parseValidDispatchBaseForWrite(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  const p = parseFiniteCoordPair(lat, lng);
  if (!p) return null;
  if (p.lat < -90 || p.lat > 90 || p.lng < -180 || p.lng > 180) return null;
  if (p.lat === 0 && p.lng === 0) return null;
  return p;
}
