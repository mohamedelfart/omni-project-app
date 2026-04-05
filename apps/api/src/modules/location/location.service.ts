import { Injectable } from '@nestjs/common';
import { GoogleMapsAdapter } from './adapters/google-maps.adapter';
import {
  type LocationAdapter,
  type LocationSourceType,
  type MapPreviewOptions,
  type NormalizedLocationContext,
} from './location-contracts';

/**
 * LocationService — the ONLY entry point Core modules use for location logic.
 * Delegates to the configured LocationAdapter; currently backed by GoogleMapsAdapter.
 * To swap providers: replace the adapter injection without changing any caller code.
 */
@Injectable()
export class LocationService {
  private readonly adapter: LocationAdapter;

  constructor(private readonly googleMapsAdapter: GoogleMapsAdapter) {
    // Adapter is resolved via DI. Core code uses LocationService, never the adapter directly.
    this.adapter = googleMapsAdapter;
  }

  /**
   * Returns a URL for a static map image suitable for display in mobile/web UIs.
   * No SDK required — the URL can be used directly as an image source.
   */
  getMapPreviewUrl(lat: number, lng: number, options?: MapPreviewOptions): string {
    return this.adapter.getMapPreviewUrl(lat, lng, options);
  }

  /**
   * Returns a deep-link URL to open the location in the native maps app.
   * Universal: works in browser (Google Maps web), iOS (Apple Maps or Google Maps), Android (Google Maps).
   */
  getOpenInMapsUrl(lat: number, lng: number, label?: string): string {
    return this.adapter.getOpenInMapsUrl(lat, lng, label);
  }

  /**
   * Returns a human-readable formatted address string from components.
   */
  formatAddress(addressLine1: string, city: string, district?: string | null, countryCode?: string | null): string {
    return this.adapter.formatAddress(addressLine1, city, district, countryCode);
  }

  /**
   * Reverse geocode: resolve lat/lng to city and countryCode.
   * Returns nulls gracefully when API key is not configured or call fails.
   * Future: swap adapter to support caching, batching, fallback providers.
   */
  reverseGeocodeSummary(lat: number, lng: number): Promise<{ city: string | null; countryCode: string | null }> {
    return this.adapter.reverseGeocodeSummary(lat, lng);
  }

  /**
   * Build a NormalizedLocationContext from raw fields.
   * Ensures a consistent shape is stored/passed across Core boundaries.
   */
  buildLocationContext(params: {
    sourceType: LocationSourceType;
    lat: number | null | undefined;
    lng: number | null | undefined;
    address?: string | null;
    placeLabel?: string | null;
    city?: string | null;
    district?: string | null;
    countryCode?: string | null;
  }): NormalizedLocationContext | null {
    if (params.lat == null || params.lng == null) return null;
    const address = params.address
      ?? (params.placeLabel ?? null);
    return {
      sourceType: params.sourceType,
      lat: params.lat,
      lng: params.lng,
      address,
      placeLabel: params.placeLabel ?? null,
      city: params.city ?? null,
      district: params.district ?? null,
      countryCode: params.countryCode ?? null,
    };
  }

  /**
   * Build a location context plus map URLs for display purposes.
   * Convenience method used by command-center and tenant screens.
   */
  buildLocationDisplay(params: {
    sourceType: LocationSourceType;
    lat: number | null | undefined;
    lng: number | null | undefined;
    address?: string | null;
    placeLabel?: string | null;
    city?: string | null;
    district?: string | null;
    countryCode?: string | null;
    markerLabel?: string;
  }): (NormalizedLocationContext & { mapPreviewUrl: string; openInMapsUrl: string }) | null {
    const ctx = this.buildLocationContext(params);
    if (!ctx) return null;
    return {
      ...ctx,
      mapPreviewUrl: this.getMapPreviewUrl(ctx.lat, ctx.lng, { markerLabel: params.markerLabel }),
      openInMapsUrl: this.getOpenInMapsUrl(ctx.lat, ctx.lng, params.placeLabel ?? params.address ?? undefined),
    };
  }
}
