import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type LocationAdapter, type MapPreviewOptions } from '../location-contracts';

/**
 * GoogleMapsAdapter — implements LocationAdapter using Google Maps URLs.
 * Core code must NOT import or reference this class directly.
 * All access goes through LocationService.
 */
@Injectable()
export class GoogleMapsAdapter implements LocationAdapter {
  constructor(private readonly config: ConfigService) {}

  private get apiKey(): string | null {
    return this.config.get<string>('GOOGLE_MAPS_API_KEY') ?? null;
  }

  getMapPreviewUrl(lat: number, lng: number, options: MapPreviewOptions = {}): string {
    const { zoom = 15, width = 600, height = 300, markerLabel } = options;

    // If no API key, return a safe fallback (OSM-based tile — no key needed)
    if (!this.apiKey) {
      const z = zoom;
      const n = Math.pow(2, z);
      const x = Math.floor(((lng + 180) / 360) * n);
      const latRad = (lat * Math.PI) / 180;
      const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
      return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    }

    const center = `${lat},${lng}`;
    const marker = markerLabel
      ? `markers=color:red|label:${encodeURIComponent(markerLabel.charAt(0))}|${center}`
      : `markers=color:red|${center}`;
    return `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=${zoom}&size=${width}x${height}&${marker}&key=${this.apiKey}`;
  }

  getOpenInMapsUrl(lat: number, lng: number, label?: string): string {
    const q = label ? `${encodeURIComponent(label)}@${lat},${lng}` : `${lat},${lng}`;
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }

  formatAddress(addressLine1: string, city: string, district?: string | null, countryCode?: string | null): string {
    const parts = [addressLine1, district, city, countryCode].filter(Boolean);
    return parts.join(', ');
  }

  async reverseGeocodeSummary(lat: number, lng: number): Promise<{ city: string | null; countryCode: string | null }> {
    // Placeholder: reverse geocoding requires an external call.
    // When GOOGLE_MAPS_API_KEY is available this will call the Geocoding API.
    // For now returns null gracefully — consumers must handle null city/countryCode.
    if (!this.apiKey) {
      return { city: null, countryCode: null };
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}`;
      const res = await fetch(url);
      if (!res.ok) return { city: null, countryCode: null };
      const data = await res.json() as {
        status: string;
        results: Array<{
          address_components: Array<{ long_name: string; types: string[] }>;
        }>;
      };
      if (data.status !== 'OK' || !data.results.length) return { city: null, countryCode: null };
      const components = data.results[0]?.address_components ?? [];
      const city = components.find((c) => c.types.includes('locality'))?.long_name ?? null;
      const countryCode = components.find((c) => c.types.includes('country'))?.long_name ?? null;
      return { city, countryCode };
    } catch {
      return { city: null, countryCode: null };
    }
  }
}
